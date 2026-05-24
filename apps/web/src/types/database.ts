export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UnidadeMedida = "g" | "ml" | "un";
export type TipoCategoria = "RECEITA" | "DESPESA";
export type TipoTransacao = "RECEITA" | "DESPESA" | "TRANSFERENCIA";
export type StatusTransacao = "PAGO" | "PENDENTE";
export type TermometroStatus = "VERDE" | "AMARELO" | "VERMELHO";

export interface Database {
  public: {
    Tables: {
      insumos: {
        Row: {
          id: string;
          nome: string;
          unidade_medida: UnidadeMedida;
          preco_compra: number;
          quantidade_compra: number;
          custo_unitario: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          unidade_medida: UnidadeMedida;
          preco_compra: number;
          quantidade_compra: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["insumos"]["Insert"]>;
      };
      produtos: {
        Row: {
          id: string;
          nome: string;
          preco_venda: number;
          markup_desejado: number | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          preco_venda?: number;
          markup_desejado?: number | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["produtos"]["Insert"]>;
      };
      ficha_tecnica: {
        Row: {
          id: string;
          produto_id: string;
          insumo_id: string;
          quantidade_utilizada: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          produto_id: string;
          insumo_id: string;
          quantidade_utilizada: number;
        };
        Update: Partial<Database["public"]["Tables"]["ficha_tecnica"]["Insert"]>;
      };
      configuracao_negocio: {
        Row: {
          id: string;
          nome_empresa: string;
          percentual_variaveis: number;
          percentual_fixas: number;
          percentual_lucro: number;
          taxa_cartao_debito: number;
          taxa_cartao_credito: number;
          categoria_taxa_cartao_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      contas_bancarias: {
        Row: {
          id: string;
          nome: string;
          tipo: "DINHEIRO" | "BANCO";
          saldo_atual: number;
          ativo: boolean;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo: "DINHEIRO" | "BANCO";
          saldo_atual?: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["contas_bancarias"]["Insert"]>;
      };
      transacoes: {
        Row: {
          id: string;
          descricao: string;
          tipo: TipoTransacao;
          valor: number;
          categoria_id: string | null;
          conta_id: string;
          status: StatusTransacao;
          data_competencia: string;
          data_pagamento: string | null;
          transacao_origem_id: string | null;
        };
        Insert: {
          id?: string;
          descricao: string;
          tipo: TipoTransacao;
          valor: number;
          categoria_id?: string | null;
          conta_id: string;
          status?: StatusTransacao;
          data_competencia?: string;
          data_pagamento?: string | null;
          transacao_origem_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["transacoes"]["Insert"]>;
      };
      categorias_financeiras: {
        Row: {
          id: string;
          nome: string;
          tipo: TipoCategoria;
          pai_id: string | null;
          ativo: boolean;
        };
      };
    };
    Views: {
      vw_produto_cmv: {
        Row: {
          produto_id: string;
          produto_nome: string;
          preco_venda: number;
          markup_desejado: number | null;
          cmv: number;
          margem_bruta_percentual: number;
        };
      };
      vw_ficha_tecnica_detalhada: {
        Row: {
          id: string;
          produto_id: string;
          produto_nome: string;
          insumo_id: string;
          insumo_nome: string;
          unidade_medida: UnidadeMedida;
          quantidade_utilizada: number;
          custo_unitario: number;
          custo_linha: number;
        };
      };
      vw_produto_termometro: {
        Row: {
          produto_id: string;
          produto_nome: string;
          preco_venda: number;
          markup_desejado: number | null;
          cmv: number;
          margem_bruta_percentual: number;
          preco_sugerido: number;
          termometro: TermometroStatus;
        };
      };
      vw_fluxo_caixa_mensal: {
        Row: {
          mes: string;
          total_receitas: number;
          total_despesas: number;
          resultado: number;
        };
      };
      vw_dre_simplificado: {
        Row: {
          mes: string;
          receita_bruta: number;
          cmv_despesas: number;
          despesas_totais: number;
          lucro_liquido: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type InsumoRow = Database["public"]["Tables"]["insumos"]["Row"];
export type ProdutoRow = Database["public"]["Tables"]["produtos"]["Row"];
export type ProdutoTermometroRow =
  Database["public"]["Views"]["vw_produto_termometro"]["Row"];
export type FichaDetalhadaRow =
  Database["public"]["Views"]["vw_ficha_tecnica_detalhada"]["Row"];
