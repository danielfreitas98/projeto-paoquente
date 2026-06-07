"use server";

import { revalidatePath } from "next/cache";
import { parseNfeXml } from "@/lib/estoque/nfe-parser";
import {
  produtoEstoqueSchema,
  movimentacaoSchema,
  importacaoNfeSchema,
} from "@/lib/estoque/schemas";
import {
  criarProdutoEstoque,
  atualizarProdutoEstoque,
  excluirProdutoEstoque,
  registrarMovimentacao,
  resolverVinculacoesItens,
  importarNotaFiscal,
  verificarNotaJaImportada,
} from "@/lib/supabase/queries/estoque";
import type { ActionResult, ItemNfeComVinculacao, NfeParsed } from "@/types/estoque";
import type { ProdutoEstoqueFormData, MovimentacaoFormData } from "@/lib/estoque/schemas";

function revalidateEstoque() {
  revalidatePath("/estoque");
  revalidatePath("/estoque/produtos");
  revalidatePath("/estoque/movimentacoes");
  revalidatePath("/estoque/importar-xml");
}

export async function criarProdutoEstoqueAction(
  input: ProdutoEstoqueFormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = produtoEstoqueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await criarProdutoEstoque(parsed.data);
  if (result.success) revalidateEstoque();
  return result;
}

export async function atualizarProdutoEstoqueAction(
  id: string,
  input: ProdutoEstoqueFormData
): Promise<ActionResult> {
  const parsed = produtoEstoqueSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await atualizarProdutoEstoque(id, parsed.data);
  if (result.success) revalidateEstoque();
  return result;
}

export async function excluirProdutoEstoqueAction(id: string): Promise<ActionResult> {
  const result = await excluirProdutoEstoque(id);
  if (result.success) revalidateEstoque();
  return result;
}

export async function registrarMovimentacaoAction(
  input: MovimentacaoFormData
): Promise<ActionResult> {
  const parsed = movimentacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const result = await registrarMovimentacao(parsed.data);
  if (result.success) revalidateEstoque();
  return result;
}

export async function processarXmlNfeAction(xml: string): Promise<
  ActionResult<{ nfe: NfeParsed; itens: ItemNfeComVinculacao[] }>
> {
  try {
    const nfe = parseNfeXml(xml);

    const jaImportada = await verificarNotaJaImportada(nfe.chaveNfe);
    if (jaImportada) {
      return { success: false, error: "Esta NF-e já foi importada anteriormente." };
    }

    const itens = await resolverVinculacoesItens(nfe);
    return { success: true, data: { nfe, itens } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao processar XML",
    };
  }
}

export async function importarNfeAction(input: {
  xml: string;
  usuario?: string;
  itensVinculados: Array<{
    descricao: string;
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    codigo: string | null;
  }>;
}): Promise<ActionResult<{ notaFiscalId: string }>> {
  const parsed = importacaoNfeSchema.safeParse({ xml: input.xml, usuario: input.usuario });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (input.itensVinculados.length === 0) {
    return { success: false, error: "Nenhum item para importar." };
  }

  try {
    const nfe = parseNfeXml(input.xml);
    const result = await importarNotaFiscal({
      nfe,
      xmlOriginal: input.xml,
      itensVinculados: input.itensVinculados,
      usuario: input.usuario,
    });

    if (result.success) revalidateEstoque();
    return result;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao importar NF-e",
    };
  }
}
