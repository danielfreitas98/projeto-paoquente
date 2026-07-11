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

/** Estrutura extensível para custos futuros (embalagem, mão de obra, impostos, etc.). */
export interface EstruturaCustos {
  custoReceita: number;
  custoEmbalagem?: number;
  custoMaoDeObra?: number;
  custosIndiretos?: number;
  impostosPercentual?: number;
}

export type CmvStatus = "VERDE" | "AMARELO" | "VERMELHO";

/** @deprecated Use CmvStatus */
export type TermometroStatus = CmvStatus;

export interface ResumoFinanceiro {
  cmv: number;
  cmvPercentual: number;
  precoAtual: number;
  precoSugerido: number;
  diferencaPreco: number;
  margemBruta: number;
  margemBrutaPercentual: number;
  markup: number;
  statusCmv: CmvStatus;
}

import { getPublicConfig } from "@/lib/config";

export const CMV_ALVO_PADRAO = getPublicConfig().app.cmvAlvoPadrao;

/** Tolerância em pontos percentuais para classificar CMV como "próximo da meta". */
export const TOLERANCIA_CMV_PP = getPublicConfig().app.margemAmarelaPp;

export function calcularCustoTotal(custos: EstruturaCustos): number {
  return (
    custos.custoReceita +
    (custos.custoEmbalagem ?? 0) +
    (custos.custoMaoDeObra ?? 0) +
    (custos.custosIndiretos ?? 0)
  );
}

export function calcularCMV(ingredientes: IngredienteFicha[]): number {
  return ingredientes.reduce(
    (total, item) => total + item.quantidade * item.custoUnitario,
    0
  );
}

/** @deprecated Use calcularCMV */
export const calcularCmv = calcularCMV;

export function calcularPrecoSugerido(
  cmv: number,
  cmvAlvo: number = CMV_ALVO_PADRAO
): number {
  if (cmvAlvo <= 0 || cmvAlvo >= 100) return 0;
  return Math.round((cmv / (cmvAlvo / 100)) * 100) / 100;
}

export function calcularCMVPercentual(
  precoVenda: number,
  cmv: number
): number {
  if (precoVenda <= 0) return 0;
  return Math.round(((cmv / precoVenda) * 100) * 100) / 100;
}

export function calcularMargemBruta(precoVenda: number, cmv: number): number {
  return Math.round((precoVenda - cmv) * 100) / 100;
}

export function calcularMargemBrutaPercentual(
  precoVenda: number,
  cmv: number
): number {
  if (precoVenda <= 0) return 0;
  return Math.round((((precoVenda - cmv) / precoVenda) * 100) * 100) / 100;
}

export function calcularMarkup(precoVenda: number, cmv: number): number {
  if (cmv <= 0) return 0;
  return Math.round((precoVenda / cmv) * 100) / 100;
}

/** @deprecated Use calcularMargemBrutaPercentual */
export function calcularMargemReal(precoVenda: number, cmv: number): number {
  return calcularMargemBrutaPercentual(precoVenda, cmv);
}

export function classificarCmv(
  cmvPercentual: number,
  cmvAlvo: number
): CmvStatus {
  if (cmvPercentual < cmvAlvo) return "VERDE";
  if (cmvPercentual <= cmvAlvo + TOLERANCIA_CMV_PP) return "AMARELO";
  return "VERMELHO";
}

/** @deprecated Use classificarCmv */
export function classificarTermometro(
  margemReal: number,
  margemDesejada: number
): CmvStatus {
  const cmvPercentual = 100 - margemReal;
  return classificarCmv(cmvPercentual, 100 - margemDesejada);
}

export function calcularResumoFinanceiro(
  ingredientes: IngredienteFicha[],
  precoVenda: number,
  cmvAlvo: number,
  custosExtras?: Omit<EstruturaCustos, "custoReceita">
): ResumoFinanceiro {
  const custoReceita = calcularCMV(ingredientes);
  const cmv = custosExtras
    ? calcularCustoTotal({ custoReceita, ...custosExtras })
    : custoReceita;

  const precoSugerido = calcularPrecoSugerido(cmv, cmvAlvo);
  const cmvPercentual = calcularCMVPercentual(precoVenda, cmv);
  const margemBruta = calcularMargemBruta(precoVenda, cmv);
  const margemBrutaPercentual = calcularMargemBrutaPercentual(precoVenda, cmv);
  const markup = calcularMarkup(precoVenda, cmv);
  const diferencaPreco = Math.round((precoVenda - precoSugerido) * 100) / 100;

  return {
    cmv,
    cmvPercentual,
    precoAtual: precoVenda,
    precoSugerido,
    diferencaPreco,
    margemBruta,
    margemBrutaPercentual,
    markup,
    statusCmv: classificarCmv(cmvPercentual, cmvAlvo),
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
