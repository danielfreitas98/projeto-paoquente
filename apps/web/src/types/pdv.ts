export type MetodoPagamentoVenda = "DINHEIRO" | "PIX" | "CARTAO";
export type StatusVenda = "CONCLUIDA" | "CANCELADA";

export interface ProdutoPdv {
  id: string;
  nome: string;
  codigo: string | null;
  preco_venda: number;
  ativo: boolean;
}

export interface ItemCarrinho {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

export interface VendaItemInput {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

export interface RegistrarVendaInput {
  itens: VendaItemInput[];
  desconto?: number;
  metodo_pagamento: MetodoPagamentoVenda;
  cliente_id?: string | null;
}

export interface RegistrarVendaResult {
  venda_id: string;
  transacao_id: string;
  total_bruto: number;
  desconto: number;
  total_liquido: number;
}

export interface Venda {
  id: string;
  total_bruto: number;
  desconto: number;
  total_liquido: number;
  metodo_pagamento: MetodoPagamentoVenda;
  status: StatusVenda;
  data_venda: string;
  cliente_id: string | null;
  transacao_id: string | null;
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
