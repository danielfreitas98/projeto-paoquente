import { shouldUseMockData } from "@/lib/config";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { LancamentoFormData } from "@/lib/financeiro/schemas";
import type { CashFlowDay, DreLinha, ResumoFinanceiroMensal } from "@/lib/financeiro/mock-data";
import {
  RESUMO_MENSAL,
  FLUXO_7_DIAS,
  DRE_MENSAL,
} from "@/lib/financeiro/mock-data";
import {
  formatDateLocal,
  formatDia,
  formatPeriodoLabel,
  parseFiltroPeriodo,
  type FiltroPeriodo,
} from "@/lib/financeiro/periodo";
import type {
  ActionResult,
  CategoriaFinanceira,
  ContaBancaria,
  PlanoContaResumo,
  TransacaoFinanceira,
} from "@/types/financeiro";

const CATEGORIAS_FIXAS = new Set(["Aluguel", "Salários"]);

function getReadClient() {
  const client = createAdminClient();
  if (!client) throw new Error("Supabase não configurado");
  return client;
}

function getWriteClient() {
  const client = createAdminClient();
  if (!client) throw new Error("Supabase não configurado");
  if (!hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY necessária para operações de escrita");
  }
  return client;
}

type TransacaoBase = {
  data_competencia: string;
  tipo: string;
  valor: number;
};

type TransacaoComCategoria = {
  tipo: string;
  valor: number;
  categorias_financeiras: { nome: string } | { nome: string }[] | null;
};

function buildFluxoPeriodo(
  transacoes: TransacaoBase[],
  periodo: FiltroPeriodo
): CashFlowDay[] {
  const [yi, mi, di] = periodo.dataInicio.split("-").map(Number);
  const [yf, mf, df] = periodo.dataFim.split("-").map(Number);
  const inicio = new Date(yi, mi - 1, di);
  const fim = new Date(yf, mf - 1, df);

  const fluxoMap = new Map<string, CashFlowDay>();
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    const key = formatDateLocal(cursor);
    fluxoMap.set(key, { dia: formatDia(key), entradas: 0, saidas: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const t of transacoes) {
    const entry = fluxoMap.get(t.data_competencia);
    if (!entry) continue;
    const valor = Number(t.valor);
    if (t.tipo === "RECEITA") entry.entradas += valor;
    if (t.tipo === "DESPESA") entry.saidas += valor;
  }

  return Array.from(fluxoMap.values());
}

function calcularTotais(transacoes: TransacaoBase[]) {
  let totalReceitas = 0;
  let totalDespesas = 0;

  for (const t of transacoes) {
    const valor = Number(t.valor);
    if (t.tipo === "RECEITA") totalReceitas += valor;
    if (t.tipo === "DESPESA") totalDespesas += valor;
  }

  return { totalReceitas, totalDespesas };
}

function buildDre(
  totalReceitas: number,
  totalDespesas: number,
  transacoesPeriodo: TransacaoComCategoria[]
): DreLinha[] {
  let cmvDespesas = 0;
  let despesasFixas = 0;
  let despesasVariaveis = 0;

  for (const t of transacoesPeriodo) {
    if (t.tipo !== "DESPESA") continue;
    const cat = t.categorias_financeiras;
    const categoria = Array.isArray(cat) ? cat[0]?.nome : cat?.nome;
    const valor = Number(t.valor);

    if (categoria === "Matéria-Prima") {
      cmvDespesas += valor;
    } else if (categoria && CATEGORIAS_FIXAS.has(categoria)) {
      despesasFixas += valor;
    } else {
      despesasVariaveis += valor;
    }
  }

  const receitaBruta = totalReceitas;
  const despesasTotais = totalDespesas;
  const margemBruta = receitaBruta - cmvDespesas;
  const lucroLiquido = receitaBruta - despesasTotais;

  return [
    {
      id: "1",
      descricao: "Faturamento Bruto (Vendas)",
      valor: receitaBruta,
      tipo: "receita",
    },
    {
      id: "2",
      descricao: "(-) CMV — Custos de Insumos",
      valor: -cmvDespesas,
      tipo: "custo",
    },
    {
      id: "3",
      descricao: "Margem Bruta",
      valor: margemBruta,
      tipo: "receita",
    },
    {
      id: "4",
      descricao: "(-) Despesas Fixas (Aluguel, Salários, etc.)",
      valor: -despesasFixas,
      tipo: "despesa",
    },
    {
      id: "5",
      descricao: "(-) Despesas Variáveis (Taxas, Embalagens)",
      valor: -despesasVariaveis,
      tipo: "despesa",
    },
    {
      id: "6",
      descricao: "Lucro Líquido do Período",
      valor: lucroLiquido,
      tipo: "resultado",
      destaque: true,
    },
  ];
}

export interface DashboardFinanceiro {
  resumo: ResumoFinanceiroMensal;
  fluxoPeriodo: CashFlowDay[];
  dre: DreLinha[];
  usandoMock: boolean;
}

export interface DadosFinanceiroPage {
  dashboard: DashboardFinanceiro;
  transacoes: TransacaoFinanceira[];
  planoContas: PlanoContaResumo[];
  categorias: CategoriaFinanceira[];
  contas: ContaBancaria[];
  periodo: FiltroPeriodo;
}

async function buscarTransacoesPeriodo(periodo: FiltroPeriodo) {
  const client = getReadClient();

  const { data, error } = await client
    .from("transacoes")
    .select("data_competencia, tipo, valor, categorias_financeiras(nome)")
    .eq("status", "PAGO")
    .is("transacao_origem_id", null)
    .gte("data_competencia", periodo.dataInicio)
    .lte("data_competencia", periodo.dataFim);

  if (error) {
    console.error("[financeiro] erro ao buscar transações:", error.message);
    return [];
  }

  return (data ?? []) as unknown as Array<
    TransacaoBase & { categorias_financeiras: TransacaoComCategoria["categorias_financeiras"] }
  >;
}

export async function obterDashboardFinanceiro(
  periodo: FiltroPeriodo
): Promise<DashboardFinanceiro> {
  const supabase = createAdminClient();
  const periodoLabel = formatPeriodoLabel(periodo.dataInicio, periodo.dataFim);

  if (shouldUseMockData() || !supabase) {
    return {
      resumo: { ...RESUMO_MENSAL, periodo: periodoLabel },
      fluxoPeriodo: FLUXO_7_DIAS,
      dre: DRE_MENSAL,
      usandoMock: true,
    };
  }

  const [transacoesPeriodo, contas] = await Promise.all([
    buscarTransacoesPeriodo(periodo),
    supabase.from("contas_bancarias").select("saldo_atual").eq("ativo", true),
  ]);

  const { totalReceitas, totalDespesas } = calcularTotais(transacoesPeriodo);

  const saldoCaixa = (
    (contas.data ?? []) as Array<{ saldo_atual: number }>
  ).reduce((acc, conta) => acc + Number(conta.saldo_atual), 0);

  const transacoesComCategoria = transacoesPeriodo.map((t) => ({
    tipo: t.tipo,
    valor: t.valor,
    categorias_financeiras: t.categorias_financeiras,
  }));

  return {
    resumo: {
      totalReceitas,
      totalDespesas,
      saldoCaixa,
      periodo: periodoLabel,
    },
    fluxoPeriodo: buildFluxoPeriodo(transacoesPeriodo, periodo),
    dre: buildDre(totalReceitas, totalDespesas, transacoesComCategoria),
    usandoMock: false,
  };
}

export async function listarCategoriasFinanceiras(): Promise<CategoriaFinanceira[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("categorias_financeiras")
    .select("id, nome, tipo")
    .eq("ativo", true)
    .order("nome");

  if (error || !data) return [];
  return data as CategoriaFinanceira[];
}

export async function listarContasBancarias(): Promise<ContaBancaria[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("contas_bancarias")
    .select("id, nome, tipo, saldo_atual")
    .eq("ativo", true)
    .order("nome");

  if (error || !data) return [];
  return data.map((c) => ({
    ...c,
    saldo_atual: Number(c.saldo_atual),
  })) as ContaBancaria[];
}

export async function listarTransacoesRecentes(
  periodo: FiltroPeriodo,
  limite = 50
): Promise<TransacaoFinanceira[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("transacoes")
    .select(
      "id, descricao, tipo, valor, status, data_competencia, data_pagamento, categorias_financeiras(nome), contas_bancarias(nome)"
    )
    .is("transacao_origem_id", null)
    .gte("data_competencia", periodo.dataInicio)
    .lte("data_competencia", periodo.dataFim)
    .order("data_competencia", { ascending: false })
    .limit(limite);

  if (error || !data) return [];

  return data.map((t) => {
    const cat = t.categorias_financeiras as
      | { nome: string }
      | { nome: string }[]
      | null;
    const conta = t.contas_bancarias as { nome: string } | { nome: string }[];
    return {
      id: t.id,
      descricao: t.descricao,
      tipo: t.tipo,
      valor: Number(t.valor),
      status: t.status,
      data_competencia: t.data_competencia,
      data_pagamento: t.data_pagamento,
      categoria_nome: Array.isArray(cat) ? cat[0]?.nome ?? null : cat?.nome ?? null,
      conta_nome: Array.isArray(conta) ? conta[0]?.nome ?? "" : conta?.nome ?? "",
    };
  }) as TransacaoFinanceira[];
}

export async function obterPlanoContasResumo(
  periodo: FiltroPeriodo
): Promise<PlanoContaResumo[]> {
  const client = getReadClient();

  const { data: categorias, error: catError } = await client
    .from("categorias_financeiras")
    .select("id, nome, tipo, pai_id")
    .eq("ativo", true);

  if (catError || !categorias) return [];

  const paiMap = new Map(categorias.map((c) => [c.id, c.nome]));

  const { data: transacoes, error: txError } = await client
    .from("transacoes")
    .select("categoria_id, valor, tipo")
    .eq("status", "PAGO")
    .is("transacao_origem_id", null)
    .gte("data_competencia", periodo.dataInicio)
    .lte("data_competencia", periodo.dataFim);

  if (txError) return [];

  const totaisPorCategoria = new Map<string, number>();
  for (const t of transacoes ?? []) {
    if (!t.categoria_id) continue;
    const atual = totaisPorCategoria.get(t.categoria_id) ?? 0;
    totaisPorCategoria.set(t.categoria_id, atual + Number(t.valor));
  }

  return categorias
    .map((c) => ({
      categoria_id: c.id,
      categoria_nome: c.nome,
      tipo: c.tipo,
      categoria_pai: c.pai_id ? (paiMap.get(c.pai_id) ?? null) : null,
      total: totaisPorCategoria.get(c.id) ?? 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total) as PlanoContaResumo[];
}

export async function registrarTransacao(
  input: LancamentoFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const client = getWriteClient();

    const { data, error } = await client
      .from("transacoes")
      .insert({
        descricao: input.descricao,
        tipo: input.tipo,
        valor: input.valor,
        categoria_id: input.categoria_id,
        conta_id: input.conta_id,
        status: "PAGO",
        data_competencia: input.data_competencia,
        data_pagamento: input.data_competencia,
        metodo_pagamento: input.metodo_pagamento ?? null,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao registrar lançamento",
    };
  }
}

export async function obterDadosFinanceiroPage(
  params?: { de?: string; ate?: string }
): Promise<DadosFinanceiroPage> {
  const periodo = parseFiltroPeriodo(params);
  const supabase = createAdminClient();

  if (shouldUseMockData() || !supabase) {
    const periodoLabel = formatPeriodoLabel(periodo.dataInicio, periodo.dataFim);
    return {
      dashboard: {
        resumo: { ...RESUMO_MENSAL, periodo: periodoLabel },
        fluxoPeriodo: FLUXO_7_DIAS,
        dre: DRE_MENSAL,
        usandoMock: true,
      },
      transacoes: [],
      planoContas: [],
      categorias: [],
      contas: [],
      periodo,
    };
  }

  const [dashboard, transacoes, planoContas, categorias, contas] =
    await Promise.all([
      obterDashboardFinanceiro(periodo),
      listarTransacoesRecentes(periodo),
      obterPlanoContasResumo(periodo),
      listarCategoriasFinanceiras(),
      listarContasBancarias(),
    ]);

  return { dashboard, transacoes, planoContas, categorias, contas, periodo };
}
