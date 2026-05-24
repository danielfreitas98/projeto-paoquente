"use server";

import { revalidatePath } from "next/cache";
import {
  salvarFichaTecnica as salvarFichaTecnicaQuery,
  excluirProduto as excluirProdutoQuery,
  type SalvarFichaTecnicaInput,
} from "@/lib/supabase/queries/produtos";

export async function salvarFichaTecnicaAction(input: SalvarFichaTecnicaInput) {
  const result = await salvarFichaTecnicaQuery(input);

  if (result.success) {
    revalidatePath("/produtos");
    revalidatePath(`/produtos/${result.produtoId}/ficha-tecnica`);
    revalidatePath("/financeiro");
  }

  return result;
}

export async function excluirProdutoAction(produtoId: string) {
  const result = await excluirProdutoQuery(produtoId);

  if (result.success) {
    revalidatePath("/produtos");
  }

  return result;
}
