import { z } from "zod";

export const categoriaEstoqueSchema = z.enum(["INSUMO", "ACABADO", "REFRIGERADO"]);
export const tipoMovimentacaoSchema = z.enum(["ENTRADA", "SAIDA", "AJUSTE"]);
export const unidadeMedidaEstoqueSchema = z.enum(["g", "ml", "un", "kg", "l", "cx", "pct"]);

export const produtoEstoqueSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  descricao: z.string().min(1, "Descrição é obrigatória").max(200),
  categoria: categoriaEstoqueSchema,
  unidade_medida: unidadeMedidaEstoqueSchema,
  estoque_minimo: z.number().min(0, "Estoque mínimo deve ser >= 0"),
  custo_medio: z.number().min(0),
});

export const produtoEstoqueUpdateSchema = produtoEstoqueSchema.extend({
  id: z.string().uuid(),
});

export const movimentacaoSchema = z
  .object({
    produto_id: z.string().uuid("Selecione um produto"),
    tipo: tipoMovimentacaoSchema,
    quantidade: z.number().positive("Quantidade deve ser maior que zero"),
    custo_unitario: z.number().min(0),
    observacao: z.string().max(500).optional(),
    usuario: z.string().max(100).optional(),
    lote: z.string().max(50).optional(),
    data_fabricacao: z.string().optional(),
    data_validade: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "ENTRADA" && !data.custo_unitario && data.custo_unitario !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o custo unitário para entradas",
        path: ["custo_unitario"],
      });
    }
  });

export const loteRefrigeradoSchema = z.object({
  produto_id: z.string().uuid(),
  lote: z.string().min(1, "Lote é obrigatório"),
  quantidade: z.number().min(0),
  data_fabricacao: z.string().optional(),
  data_validade: z.string().min(1, "Data de validade é obrigatória"),
});

export const vinculacaoXmlSchema = z.object({
  descricao_xml: z.string().min(1),
  produto_id: z.string().uuid("Selecione um produto"),
});

export const importacaoNfeSchema = z.object({
  xml: z.string().min(10, "XML inválido ou vazio"),
  usuario: z.string().max(100).optional(),
});

export type ProdutoEstoqueFormData = z.infer<typeof produtoEstoqueSchema>;
export type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;
export type LoteRefrigeradoFormData = z.infer<typeof loteRefrigeradoSchema>;
export type VinculacaoXmlFormData = z.infer<typeof vinculacaoXmlSchema>;

export const CATEGORIA_LABELS: Record<string, string> = {
  INSUMO: "Insumo",
  ACABADO: "Produto Acabado",
  REFRIGERADO: "Refrigerado",
};

export const TIPO_MOVIMENTACAO_LABELS: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste de Inventário",
};

export const UNIDADE_LABELS: Record<string, string> = {
  g: "Gramas (g)",
  ml: "Mililitros (ml)",
  un: "Unidade (un)",
  kg: "Quilogramas (kg)",
  l: "Litros (l)",
  cx: "Caixa (cx)",
  pct: "Pacote (pct)",
};
