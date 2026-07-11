import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { LancamentoFormData } from "@/lib/financeiro/schemas";
import type { CashFlowDay, DreLinha, ResumoFinanceiroMensal } from "@/lib/financeiro/mock-data";
import {
  RESUMO_MENSAL,
  FLUXO_7_DIAS,
  DRE_MENSAL,
} from "@/lib/financeiro/mock-data";
import type {
  ActionResult,
  CategoriaFinanceira,
  ContaBancaria,
  PlanoContaResumo,
  TransacaoFinanceira,
} from "@/types/financeiro";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CATEGORIAS_FIXAS = new Set(["Aluguel", "Salários"]);

function formatPeriodo(date: Date): string {
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): string {
  return formatDateLocal(new Date(date.getFullYear(), date.getMonth(), 1));
}

function formatDia(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

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

export interface DashboardFinanceiro {
  resumo: ResumoFinanceiroMensal;
  fluxo7Dias: CashFlowDay[];
  dre: DreLinha[];
  usandoMock: boolean;
}

export interface DadosFinanceiroPage {
  dashboard: DashboardFinanceiro;
  transacoes: TransacaoFinanceira[];
  planoContas: PlanoContaResumo[];
  categorias: CategoriaFinanceira[];
  contas: ContaBancaria[];
}

function buildFluxo7Dias(
  transacoes: Array<{ data_competencia: string; tipo: string; valor: number }>,
  hoje: Date
): CashFlowDay[] {
  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(hoje.getDate() - 6);

  const fluxoMap = new Map<string, CashFlowDay>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(seteDiasAtras);
    d.setDate(seteDiasAtras.getDate() + i);
    const key = formatDateLocal(d);
    fluxoMap.set(key, { dia: formatDia(key), entradas: 0, saidas: 0 });
  }

  for (const t of transacoes) {
    const key = t.data_competencia;
    const entry = fluxoMap.get(key);
    if (!entry) continue;
    const valor = Number(t.valor);
    if (t.tipo === "RECEITA") entry.entradas += valor;
    if (t.tipo === "DESPESA") entry.saidas += valor;
  }

  return Array.from(fluxoMap.values());
}

function buildDre(
  dreRow: {
    receita_bruta: number;
    cmv_despesas: number;
    despesas_totais: number;
    lucro_liquido: number;
  } | null,
  totalReceitas: number,
  totalDespesas: number,
  transacoesMes: Array<{
    tipo: string;
    valor: number;
    categorias_financeiras: { nome: string } | { nome: string }[] | null;
  }>
): DreLinha[] {
  const receitaBruta = Number(dreRow?.receita_bruta ?? totalReceitas);
  const cmvDespesas = Number(dreRow?.cmv_despesas ?? 0);
  const despesasTotais = Number(dreRow?.despesas_totais ?? totalDespesas);
  const lucroLiquido = Number(
    dreRow?.lucro_liquido ?? receitaBruta - despesasTotais
  );

  let despesasFixas = 0;
  let despesasVariaveis = 0;

  for (const t of transacoesMes) {
    if (t.tipo !== "DESPESA") continue;
    const cat = t.categorias_financeiras;
    const categoria = Array.isArray(cat) ? cat[0]?.nome : cat?.nome;
    const valor = Number(t.valor);
    if (categoria && CATEGORIAS_FIXAS.has(categoria)) {
      despesasFixas += valor;
    } else if (categoria !== "Matéria-Prima") {
      despesasVariaveis += valor;
    }
  }

  const outrasDespesas = Math.max(
    despesasTotais - cmvDespesas - despesasFixas - despesasVariaveis,
    0
  );
  despesasVariaveis += outrasDespesas;

  const margemBruta = receitaBruta - cmvDespesas;

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
      descricao: "Lucro Líquido do Mês",
      valor: lucroLiquido,
      tipo: "resultado",
      destaque: true,
    },
  ];
}

export async function obterDashboardFinanceiro(): Promise<DashboardFinanceiro> {
  const supabase = createAdminClient();
  const hoje = new Date();
  const mesAtual = startOfMonth(hoje);
  const periodo = formatPeriodo(hoje);

  if (!supabase) {
    return {
      resumo: { ...RESUMO_MENSAL, periodo },
      fluxo7Dias: FLUXO_7_DIAS,
      dre: DRE_MENSAL,
      usandoMock: true,
    };
  }

  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(hoje.getDate() - 6);
  const dataInicio = formatDateLocal(seteDiasAtras);
  const dataFim = formatDateLocal(hoje);

  const [fluxoMensal, contas, transacoes7d, dreView, transacoesMes] =
    await Promise.all([
      supabase
        .from("vw_fluxo_caixa_mensal")
        .select("*")
        .eq("mes", mesAtual)
        .maybeSingle(),
      supabase.from("contas_bancarias").select("saldo_atual").eq("ativo", true),
      supabase
        .from("transacoes")
        .select("data_competencia, tipo, valor")
        .eq("status", "PAGO")
        .is("transacao_origem_id", null)
        .gte("data_competencia", dataInicio)
        .lte("data_competencia", dataFim),
      supabase
        .from("vw_dre_simplificado")
        .select("*")
        .eq("mes", mesAtual)
        .maybeSingle(),
      supabase
        .from("transacoes")
        .select("valor, tipo, categorias_financeiras(nome)")
        .eq("status", "PAGO")
        .is("transacao_origem_id", null)
        .gte("data_competencia", mesAtual)
        .lte("data_competencia", dataFim),
    ]);

  const saldoCaixa = (
    (contas.data ?? []) as Array<{ saldo_atual: number }>
  ).reduce((acc, conta) => acc + Number(conta.saldo_atual), 0);

  const fluxoRow = fluxoMensal.data as {
    total_receitas: number;
    total_despesas: number;
  } | null;
  const dreRow = dreView.data as {
    receita_bruta: number;
    cmv_despesas: number;
    despesas_totais: number;
    lucro_liquido: number;
  } | null;

  const totalReceitas = Number(fluxoRow?.total_receitas ?? 0);
  const totalDespesas = Number(fluxoRow?.total_despesas ?? 0);

  const transacoes7dData = (transacoes7d.data ?? []) as Array<{
    data_competencia: string;
    tipo: string;
    valor: number;
  }>;

  const transacoesMesData = (transacoesMes.data ?? []) as unknown as Array<{
    tipo: string;
    valor: number;
    categorias_financeiras: { nome: string } | { nome: string }[] | null;
  }>;

  return {
    resumo: { totalReceitas, totalDespesas, saldoCaixa, periodo },
    fluxo7Dias: buildFluxo7Dias(transacoes7dData, hoje),
    dre: buildDre(dreRow, totalReceitas, totalDespesas, transacoesMesData),
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
  limite = 20
): Promise<TransacaoFinanceira[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("transacoes")
    .select(
      "id, descricao, tipo, valor, status, data_competencia, data_pagamento, categorias_financeiras(nome), contas_bancarias(nome)"
    )
    .is("transacao_origem_id", null)
    .order("data_competencia", { ascending: false })
    .order("created_at", { ascending: false })
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

export async function obterPlanoContasResumo(): Promise<PlanoContaResumo[]> {
  const client = getReadClient();
  const hoje = new Date();
  const mesAtual = startOfMonth(hoje);
  const dataFim = formatDateLocal(hoje);

  const { data: categorias, error: catError } = await client
    .from("categorias_financeiras")
    .select("id, nome, tipo, pai_id")
    .eq("ativo", true);

  if (catError || !categorias) return [];

  const paiMap = new Map(categorias.map((c) => [c.id, c.nome]));

  const { data: transacoes, error: txError } = await client
    .from("transacoes")
    .select("categoria_id, valor")
    .eq("status", "PAGO")
    .is("transacao_origem_id", null)
    .gte("data_competencia", mesAtual)
    .lte("data_competencia", dataFim);

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

export async function obterDadosFinanceiroPage(): Promise<DadosFinanceiroPage> {
  const supabase = createAdminClient();

  if (!supabase) {
    const hoje = new Date();
    const periodo = formatPeriodo(hoje);
    return {
      dashboard: {
        resumo: { ...RESUMO_MENSAL, periodo },
        fluxo7Dias: FLUXO_7_DIAS,
        dre: DRE_MENSAL,
        usandoMock: true,
      },
      transacoes: [],
      planoContas: [],
      categorias: [],
      contas: [],
    };
  }

  const [dashboard, transacoes, planoContas, categorias, contas] =
    await Promise.all([
      obterDashboardFinanceiro(),
      listarTransacoesRecentes(),
      obterPlanoContasResumo(),
      listarCategoriasFinanceiras(),
      listarContasBancarias(),
    ]);

  return { dashboard, transacoes, planoContas, categorias, contas };
}
