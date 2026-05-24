import { createAdminClient } from "@/lib/supabase/admin";
import type { CashFlowDay, DreLinha, ResumoFinanceiroMensal } from "@/lib/financeiro/mock-data";
import {
  RESUMO_MENSAL,
  FLUXO_7_DIAS,
  DRE_MENSAL,
} from "@/lib/financeiro/mock-data";

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

function formatPeriodo(date: Date): string {
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
}

function startOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatDia(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

const CATEGORIAS_FIXAS = new Set(["Aluguel", "Salários"]);

export interface DashboardFinanceiro {
  resumo: ResumoFinanceiroMensal;
  fluxo7Dias: CashFlowDay[];
  dre: DreLinha[];
  usandoMock: boolean;
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
  const dataInicio = seteDiasAtras.toISOString().slice(0, 10);

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
        .lte("data_competencia", hoje.toISOString().slice(0, 10)),
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
        .lte("data_competencia", hoje.toISOString().slice(0, 10)),
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

  const resumo: ResumoFinanceiroMensal = {
    totalReceitas,
    totalDespesas,
    saldoCaixa,
    periodo,
  };

  const fluxoMap = new Map<string, CashFlowDay>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(seteDiasAtras);
    d.setDate(seteDiasAtras.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    fluxoMap.set(key, { dia: formatDia(key), entradas: 0, saidas: 0 });
  }

  for (const t of (transacoes7d.data ?? []) as Array<{
    data_competencia: string;
    tipo: string;
    valor: number;
  }>) {
    const key = t.data_competencia;
    const entry = fluxoMap.get(key);
    if (!entry) continue;
    const valor = Number(t.valor);
    if (t.tipo === "RECEITA") entry.entradas += valor;
    if (t.tipo === "DESPESA") entry.saidas += valor;
  }

  const fluxo7Dias = Array.from(fluxoMap.values());

  const receitaBruta = Number(dreRow?.receita_bruta ?? totalReceitas);
  const cmvDespesas = Number(dreRow?.cmv_despesas ?? 0);
  const despesasTotais = Number(dreRow?.despesas_totais ?? totalDespesas);
  const lucroLiquido = Number(dreRow?.lucro_liquido ?? receitaBruta - despesasTotais);

  let despesasFixas = 0;
  let despesasVariaveis = 0;

  type TransacaoComCategoria = {
    tipo: string;
    valor: number;
    categorias_financeiras: { nome: string } | { nome: string }[] | null;
  };

  for (const t of (transacoesMes.data ?? []) as unknown as TransacaoComCategoria[]) {
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

  const outrasDespesas = Math.max(despesasTotais - cmvDespesas - despesasFixas - despesasVariaveis, 0);
  despesasVariaveis += outrasDespesas;

  const margemBruta = receitaBruta - cmvDespesas;

  const dre: DreLinha[] = [
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

  const semDados =
    totalReceitas === 0 &&
    totalDespesas === 0 &&
    (transacoes7d.data ?? []).length === 0;

  if (semDados) {
    return {
      resumo: { ...RESUMO_MENSAL, periodo },
      fluxo7Dias: FLUXO_7_DIAS,
      dre: DRE_MENSAL,
      usandoMock: true,
    };
  }

  return { resumo, fluxo7Dias, dre, usandoMock: false };
}
