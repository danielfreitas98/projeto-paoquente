export type UnidadeMedida = "g" | "ml" | "un";

export interface Insumo {
  id: string;
  nome: string;
  unidadeMedida: UnidadeMedida;
  custoUnitario: number;
}

export interface IngredienteFicha {
  id: string;
  insumoId: string;
  nome: string;
  unidadeMedida: UnidadeMedida;
  quantidade: number;
  custoUnitario: number;
}

export type TermometroStatus = "VERDE" | "AMARELO" | "VERMELHO";

export interface ResumoFinanceiro {
  cmv: number;
  precoSugerido: number;
  margemReal: number;
  lucroUnitario: number;
  termometro: TermometroStatus;
}

/** Percentuais padrão da configuração do negócio (variáveis + fixas + lucro < 100). */
export const CONFIG_MARKUP_PADRAO = {
  percentualVariaveis: 35,
  percentualFixas: 20,
  percentualLucro: 15,
};

export function calcularMarkupMultiplicador(
  variaveis = CONFIG_MARKUP_PADRAO.percentualVariaveis,
  fixas = CONFIG_MARKUP_PADRAO.percentualFixas,
  lucro = CONFIG_MARKUP_PADRAO.percentualLucro
): number {
  const soma = variaveis + fixas + lucro;
  if (soma >= 100) return 1;
  return 100 / (100 - soma);
}

export function calcularCmv(ingredientes: IngredienteFicha[]): number {
  return ingredientes.reduce(
    (total, item) => total + item.quantidade * item.custoUnitario,
    0
  );
}

export function calcularPrecoSugerido(cmv: number): number {
  return cmv * calcularMarkupMultiplicador();
}

export function calcularMargemReal(precoVenda: number, cmv: number): number {
  if (precoVenda <= 0) return 0;
  return ((precoVenda - cmv) / precoVenda) * 100;
}

export function classificarTermometro(
  margemReal: number,
  margemDesejada: number
): TermometroStatus {
  if (margemReal < 0) return "VERMELHO";
  if (margemReal < margemDesejada) return "AMARELO";
  return "VERDE";
}

export function calcularResumoFinanceiro(
  ingredientes: IngredienteFicha[],
  precoVenda: number,
  margemDesejada: number
): ResumoFinanceiro {
  const cmv = calcularCmv(ingredientes);
  const precoSugerido = calcularPrecoSugerido(cmv);
  const margemReal = calcularMargemReal(precoVenda, cmv);
  const lucroUnitario = precoVenda - cmv;

  return {
    cmv,
    precoSugerido,
    margemReal,
    lucroUnitario,
    termometro: classificarTermometro(margemReal, margemDesejada),
  };
}

export const INSUMOS_MOCK: Insumo[] = [
  { id: "1", nome: "Farinha de Trigo", unidadeMedida: "g", custoUnitario: 0.0045 },
  { id: "2", nome: "Manteiga", unidadeMedida: "g", custoUnitario: 0.038 },
  { id: "3", nome: "Açúcar", unidadeMedida: "g", custoUnitario: 0.005 },
  { id: "4", nome: "Ovos", unidadeMedida: "un", custoUnitario: 0.65 },
  { id: "5", nome: "Leite Integral", unidadeMedida: "ml", custoUnitario: 0.0048 },
  { id: "6", nome: "Fermento Biológico", unidadeMedida: "g", custoUnitario: 0.022 },
  { id: "7", nome: "Chocolate ao Leite", unidadeMedida: "g", custoUnitario: 0.055 },
  { id: "8", nome: "Café em Grãos", unidadeMedida: "g", custoUnitario: 0.08 },
  { id: "9", nome: "Sal", unidadeMedida: "g", custoUnitario: 0.002 },
  { id: "10", nome: "Creme de Leite", unidadeMedida: "ml", custoUnitario: 0.012 },
];

export function formatUnidade(unidade: UnidadeMedida): string {
  const labels: Record<UnidadeMedida, string> = {
    g: "g",
    ml: "ml",
    un: "un",
  };
  return labels[unidade];
}
