export type CategoriaEstoque = "INSUMO" | "ACABADO" | "REFRIGERADO";
export type TipoMovimentacaoEstoque = "ENTRADA" | "SAIDA" | "AJUSTE";
export type UnidadeMedidaEstoque = "g" | "ml" | "un" | "kg" | "l" | "cx" | "pct";
export type StatusValidade = "VENCIDO" | "CRITICO" | "ATENCAO" | "OK";

export interface ProdutoEstoque {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaEstoque;
  unidade_medida: UnidadeMedidaEstoque;
  estoque_atual: number;
  estoque_minimo: number;
  custo_medio: number;
  ativo: boolean;
  organizacao_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoteRefrigerado {
  id: string;
  produto_id: string;
  lote: string;
  quantidade: number;
  data_fabricacao: string | null;
  data_validade: string;
  ativo: boolean;
  organizacao_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: string;
  cnpj: string;
  razao_social: string;
  organizacao_id: string | null;
  created_at: string;
}

export interface NotaFiscal {
  id: string;
  chave_nfe: string;
  numero_nota: string;
  fornecedor_id: string;
  data_emissao: string;
  valor_total: number;
  xml_original: string;
  organizacao_id: string | null;
  created_at: string;
}

export interface ItemNotaFiscal {
  id: string;
  nota_fiscal_id: string;
  produto_id: string;
  codigo_fornecedor: string | null;
  descricao_xml: string;
  quantidade: number;
  valor_unitario: number;
}

export interface VinculacaoProdutoXml {
  id: string;
  descricao_xml: string;
  produto_id: string;
  organizacao_id: string | null;
  created_at: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  custo_unitario: number;
  observacao: string | null;
  usuario: string | null;
  usuario_id: string | null;
  nota_fiscal_id: string | null;
  lote_id: string | null;
  organizacao_id: string | null;
  created_at: string;
}

export interface MovimentacaoComProduto extends MovimentacaoEstoque {
  produto_codigo: string;
  produto_descricao: string;
  produto_unidade: UnidadeMedidaEstoque;
}

export interface LoteValidadeAlerta {
  id: string;
  lote: string;
  quantidade: number;
  data_fabricacao: string | null;
  data_validade: string;
  produto_id: string;
  produto_codigo: string;
  produto_descricao: string;
  dias_para_vencer: number;
  status_validade: StatusValidade;
}

export interface EstoqueDashboard {
  total_produtos: number;
  estoque_baixo: number;
  produtos_refrigerados: number;
  alertas_validade: number;
}

export interface ItemNfeXml {
  codigo: string | null;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface NfeParsed {
  chaveNfe: string;
  numeroNota: string;
  fornecedorCnpj: string;
  fornecedorRazaoSocial: string;
  dataEmissao: string;
  valorTotal: number;
  itens: ItemNfeXml[];
}

export interface ItemNfeComVinculacao extends ItemNfeXml {
  produtoId: string | null;
  vinculacaoExistente: boolean;
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
