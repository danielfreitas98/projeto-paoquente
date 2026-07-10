import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProdutoPdv,
  RegistrarVendaInput,
  RegistrarVendaResult,
  ActionResult,
} from "@/types/pdv";
import { chaveProdutoPdv } from "@/types/pdv";

type ProdutoRow = {
  id: string;
  nome: string;
  codigo?: string | null;
  preco_venda: number;
  ativo: boolean;
};

type EstoqueRow = {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  preco_venda?: number | null;
  custo_medio?: number | null;
  ativo: boolean;
  produto_venda_id?: string | null;
};

function mapProduto(row: ProdutoRow): ProdutoPdv {
  return {
    id: row.id,
    origem: "produto",
    nome: row.nome,
    codigo: row.codigo ?? null,
    preco_venda: Number(row.preco_venda),
    ativo: row.ativo,
  };
}

function mapEstoque(row: EstoqueRow): ProdutoPdv {
  const preco =
    Number(row.preco_venda ?? 0) > 0
      ? Number(row.preco_venda)
      : Number(row.custo_medio ?? 0) > 0
        ? Math.round(Number(row.custo_medio) * 2.5 * 100) / 100
        : 0;

  return {
    id: row.id,
    origem: "estoque",
    nome: row.descricao,
    codigo: row.codigo,
    preco_venda: preco,
    ativo: row.ativo,
    categoria: row.categoria,
  };
}

export async function listarProdutosPdv(): Promise<ProdutoPdv[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  let { data, error } = await supabase
    .from("produtos")
    .select("id, nome, codigo, preco_venda, ativo")
    .eq("ativo", true)
    .order("nome");

  if (error?.message.includes("codigo")) {
    const fallback = await supabase
      .from("produtos")
      .select("id, nome, preco_venda, ativo")
      .eq("ativo", true)
      .order("nome");
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    console.error("listarProdutosPdv:", error.message);
    return [];
  }

  return ((data ?? []) as ProdutoRow[]).map(mapProduto);
}

async function buscarEstoqueRows(): Promise<{ rows: EstoqueRow[]; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { rows: [], error: "Supabase não configurado." };
  }

  const queries = [
  {
    label: "completo",
    select:
      "id, codigo, descricao, categoria, preco_venda, custo_medio, ativo, produto_venda_id",
  },
  {
    label: "sem_preco_venda",
    select: "id, codigo, descricao, categoria, custo_medio, ativo, produto_venda_id",
  },
  {
    label: "minimo",
    select: "id, codigo, descricao, categoria, ativo, produto_venda_id",
  },
];

  let lastError: string | undefined;

  for (const query of queries) {
    const { data, error } = await supabase
      .from("estoque_produtos")
      .select(query.select)
      .eq("ativo", true)
      .order("descricao");

    if (!error) {
      return { rows: (data ?? []) as unknown as EstoqueRow[] };
    }

    lastError = error.message;
    console.warn(`buscarEstoqueRows (${query.label}):`, error.message);
  }

  return { rows: [], error: lastError };
}

export async function listarProdutosEstoquePdv(): Promise<ProdutoPdv[]> {
  const { rows } = await buscarEstoqueRows();
  return rows.map(mapEstoque);
}

export async function listarTodosProdutosPdv(): Promise<ProdutoPdv[]> {
  const [produtos, estoqueResult] = await Promise.all([
    listarProdutosPdv(),
    buscarEstoqueRows(),
  ]);

  if (estoqueResult.error) {
    console.error("listarTodosProdutosPdv estoque:", estoqueResult.error);
  }

  const estoque = estoqueResult.rows.map(mapEstoque);

  return [...produtos, ...estoque].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
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

  const [itensProduto, itensEstoque] = await Promise.all([
    supabase
      .from("venda_itens")
      .select("produto_id, quantidade")
      .not("produto_id", "is", null),
    supabase
      .from("venda_itens")
      .select("estoque_produto_id, quantidade")
      .not("estoque_produto_id", "is", null),
  ]);

  for (const row of itensProduto.data ?? []) {
    const chave = chaveProdutoPdv({
      id: row.produto_id as string,
      origem: "produto",
    });
    const qtd = Number(row.quantidade);
    contagem.set(chave, (contagem.get(chave) ?? 0) + qtd);
  }

  for (const row of itensEstoque.data ?? []) {
    const chave = chaveProdutoPdv({
      id: row.estoque_produto_id as string,
      origem: "estoque",
    });
    const qtd = Number(row.quantidade);
    contagem.set(chave, (contagem.get(chave) ?? 0) + qtd);
  }

  return contagem;
}

export async function listarProdutosMaisVendidos(
  limite = 12
): Promise<ProdutoPdv[]> {
  const [produtos, contagem] = await Promise.all([
    listarTodosProdutosPdv(),
    contarVendasPorProduto(),
  ]);

  if (contagem.size === 0) {
    return produtos.slice(0, limite);
  }

  return [...produtos]
    .sort(
      (a, b) =>
        (contagem.get(chaveProdutoPdv(b)) ?? 0) -
        (contagem.get(chaveProdutoPdv(a)) ?? 0)
    )
    .slice(0, limite);
}
