import { z } from "zod";

export const vendaItemSchema = z.object({
  produto_id: z.string().uuid("Produto inválido"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  preco_unitario: z.number().min(0, "Preço inválido"),
});

export const registrarVendaSchema = z.object({
  itens: z.array(vendaItemSchema).min(1, "Informe ao menos um item"),
  desconto: z.number().min(0).optional().default(0),
  metodo_pagamento: z.enum(["DINHEIRO", "PIX", "CARTAO"]),
  cliente_id: z.string().uuid().nullable().optional(),
});

export type RegistrarVendaFormData = z.infer<typeof registrarVendaSchema>;
