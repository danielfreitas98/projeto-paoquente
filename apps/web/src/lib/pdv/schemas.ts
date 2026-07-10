import { z } from "zod";

export const vendaItemSchema = z
  .object({
    produto_id: z.string().uuid("Produto inválido").optional(),
    estoque_produto_id: z.string().uuid("Produto de estoque inválido").optional(),
    quantidade: z.number().positive("Quantidade deve ser maior que zero"),
    preco_unitario: z.number().min(0, "Preço inválido"),
  })
  .refine(
    (item) =>
      (item.produto_id && !item.estoque_produto_id) ||
      (!item.produto_id && item.estoque_produto_id),
    { message: "Informe produto_id ou estoque_produto_id" }
  );

export const registrarVendaSchema = z.object({
  itens: z.array(vendaItemSchema).min(1, "Informe ao menos um item"),
  desconto: z.number().min(0).optional().default(0),
  metodo_pagamento: z.enum(["DINHEIRO", "PIX", "CARTAO"]),
  cliente_id: z.string().uuid().nullable().optional(),
});

export type RegistrarVendaFormData = z.infer<typeof registrarVendaSchema>;
