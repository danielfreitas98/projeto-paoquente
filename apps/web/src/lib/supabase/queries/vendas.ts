import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProdutoPdv,
  RegistrarVendaInput,
  RegistrarVendaResult,
  ActionResult,
} from "@/types/pdv";

export async function listarProdutosPdv(): Promise<ProdutoPdv[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, codigo, preco_venda, ativo")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("listarProdutosPdv:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    preco_venda: Number(row.preco_venda),
    ativo: row.ativo,
  }));
}

export async function registrarVenda(
  input: RegistrarVendaInput
): Promise<ActionResult<RegistrarVendaResult>> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase não configurado. Verifique as variáveis de ambiente.",
    };
  }

  const { data, error } = await supabase.rpc("registrar_venda", {
    p_payload: {
      itens: input.itens,
      desconto: input.desconto ?? 0,
      metodo_pagamento: input.metodo_pagamento,
      cliente_id: input.cliente_id ?? null,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as RegistrarVendaResult;
  return { success: true, data: result };
}

export async function contarVendasPorProduto(): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const contagem = new Map<string, number>();
  if (!supabase) return contagem;

  const { data, error } = await supabase
    .from("venda_itens")
    .select("produto_id, quantidade");

  if (error || !data) return contagem;

  for (const row of data) {
    const id = row.produto_id as string;
    const qtd = Number(row.quantidade);
    contagem.set(id, (contagem.get(id) ?? 0) + qtd);
  }

  return contagem;
}

export async function listarProdutosMaisVendidos(
  limite = 12
): Promise<ProdutoPdv[]> {
  const [produtos, contagem] = await Promise.all([
    listarProdutosPdv(),
    contarVendasPorProduto(),
  ]);

  if (contagem.size === 0) {
    return produtos.slice(0, limite);
  }

  return [...produtos]
    .sort((a, b) => (contagem.get(b.id) ?? 0) - (contagem.get(a.id) ?? 0))
    .slice(0, limite);
}
