import { z } from "zod";

export const lancamentoSchema = z.object({
  tipo: z.enum(["RECEITA", "DESPESA"]),
  descricao: z.string().min(1, "Descrição é obrigatória").max(200),
  valor: z.number().positive("Valor deve ser maior que zero"),
  categoria_id: z.string().uuid("Selecione uma categoria"),
  conta_id: z.string().uuid("Selecione uma conta"),
  data_competencia: z.string().min(1, "Data é obrigatória"),
  metodo_pagamento: z
    .enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "TRANSFERENCIA"])
    .optional(),
});

export type LancamentoFormData = z.infer<typeof lancamentoSchema>;
