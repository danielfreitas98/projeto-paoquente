"use server";

import { revalidatePath } from "next/cache";
import { lancamentoSchema } from "@/lib/financeiro/schemas";
import { registrarTransacao } from "@/lib/supabase/queries/financeiro";
import type { LancamentoFormData } from "@/lib/financeiro/schemas";
import type { ActionResult } from "@/types/financeiro";

function revalidateFinanceiro() {
  revalidatePath("/financeiro");
}

export async function registrarLancamentoAction(
  input: LancamentoFormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const result = await registrarTransacao(parsed.data);
  if (result.success) revalidateFinanceiro();
  return result;
}
