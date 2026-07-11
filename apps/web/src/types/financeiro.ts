export type TipoTransacao = "RECEITA" | "DESPESA" | "TRANSFERENCIA";
export type TipoCategoria = "RECEITA" | "DESPESA";
export type StatusTransacao = "PAGO" | "PENDENTE";
export type MetodoPagamento =
  | "DINHEIRO"
  | "PIX"
  | "DEBITO"
  | "CREDITO"
  | "TRANSFERENCIA";

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoCategoria;
}

export interface ContaBancaria {
  id: string;
  nome: string;
  tipo: "DINHEIRO" | "BANCO";
  saldo_atual: number;
}

export interface TransacaoFinanceira {
  id: string;
  descricao: string;
  tipo: TipoTransacao;
  valor: number;
  status: StatusTransacao;
  data_competencia: string;
  data_pagamento: string | null;
  categoria_nome: string | null;
  conta_nome: string;
}

export interface PlanoContaResumo {
  categoria_id: string;
  categoria_nome: string;
  tipo: TipoCategoria;
  categoria_pai: string | null;
  total: number;
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
