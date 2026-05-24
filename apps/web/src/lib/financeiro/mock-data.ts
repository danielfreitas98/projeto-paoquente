export interface CashFlowDay {
  dia: string;
  entradas: number;
  saidas: number;
}

export interface DreLinha {
  id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "custo" | "despesa" | "resultado";
  destaque?: boolean;
}

export interface ResumoFinanceiroMensal {
  totalReceitas: number;
  totalDespesas: number;
  saldoCaixa: number;
  periodo: string;
}

export const RESUMO_MENSAL: ResumoFinanceiroMensal = {
  totalReceitas: 48750.0,
  totalDespesas: 32180.5,
  saldoCaixa: 16569.5,
  periodo: "Maio 2026",
};

export const FLUXO_7_DIAS: CashFlowDay[] = [
  { dia: "18/05", entradas: 6200, saidas: 4100 },
  { dia: "19/05", entradas: 5800, saidas: 3200 },
  { dia: "20/05", entradas: 7100, saidas: 4800 },
  { dia: "21/05", entradas: 6500, saidas: 3900 },
  { dia: "22/05", entradas: 8200, saidas: 5200 },
  { dia: "23/05", entradas: 7800, saidas: 4500 },
  { dia: "24/05", entradas: 7150, saidas: 6480.5 },
];

export const DRE_MENSAL: DreLinha[] = [
  { id: "1", descricao: "Faturamento Bruto (Vendas)", valor: 48750.0, tipo: "receita" },
  { id: "2", descricao: "(-) CMV — Custos de Insumos", valor: -14280.0, tipo: "custo" },
  { id: "3", descricao: "Margem Bruta", valor: 34470.0, tipo: "receita" },
  { id: "4", descricao: "(-) Despesas Fixas (Aluguel, Salários, etc.)", valor: -12450.0, tipo: "despesa" },
  { id: "5", descricao: "(-) Despesas Variáveis (Taxas, Embalagens)", valor: -5450.5, tipo: "despesa" },
  { id: "6", descricao: "Lucro Líquido do Mês", valor: 16569.5, tipo: "resultado", destaque: true },
];
