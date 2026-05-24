import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FichaDetalhadaRow,
  InsumoRow,
  ProdutoRow,
  ProdutoTermometroRow,
} from "@/types/database";
import type { Insumo, IngredienteFicha } from "@/lib/ficha-tecnica/calculations";
import { CONFIG_MARKUP_PADRAO } from "@/lib/ficha-tecnica/calculations";

export interface FichaTecnicaInitialData {
  produtoId: string | null;
  nomeProduto: string;
  precoVenda: number;
  margemDesejada: number;
  ingredientes: IngredienteFicha[];
  insumos: Insumo[];
}

function mapInsumo(row: InsumoRow): Insumo {
  return {
    id: row.id,
    nome: row.nome,
    unidadeMedida: row.unidade_medida,
    custoUnitario: Number(row.custo_unitario),
  };
}

function mapIngrediente(row: FichaDetalhadaRow): IngredienteFicha {
  return {
    id: row.id,
    insumoId: row.insumo_id,
    nome: row.insumo_nome,
    unidadeMedida: row.unidade_medida,
    quantidade: Number(row.quantidade_utilizada),
    custoUnitario: Number(row.custo_unitario),
  };
}

export async function listarProdutosComTermometro(): Promise<
  ProdutoTermometroRow[]
> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("vw_produto_termometro")
    .select("*")
    .order("produto_nome");

  if (error) {
    console.error("listarProdutosComTermometro:", error.message);
    return [];
  }

  return (data ?? []) as ProdutoTermometroRow[];
}

export async function listarInsumosAtivos(): Promise<Insumo[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("insumos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error("listarInsumosAtivos:", error.message);
    return [];
  }

  return ((data ?? []) as InsumoRow[]).map(mapInsumo);
}

export async function obterConfiguracaoMarkup(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return CONFIG_MARKUP_PADRAO.percentualLucro;

  const { data, error } = await supabase
    .from("configuracao_negocio")
    .select("percentual_lucro")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return CONFIG_MARKUP_PADRAO.percentualLucro;
  }

  return Number((data as { percentual_lucro: number }).percentual_lucro);
}

export async function obterFichaTecnicaPorProduto(
  produtoId: string
): Promise<FichaTecnicaInitialData | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const [produtoResult, fichaResult, insumos] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", produtoId).maybeSingle(),
    supabase
      .from("vw_ficha_tecnica_detalhada")
      .select("*")
      .eq("produto_id", produtoId),
    listarInsumosAtivos(),
  ]);

  if (produtoResult.error) {
    console.error("obterFichaTecnicaPorProduto:", produtoResult.error.message);
    return null;
  }

  const produto = produtoResult.data as ProdutoRow | null;
  if (!produto) return null;

  const margemPadrao = await obterConfiguracaoMarkup();

  return {
    produtoId: produto.id,
    nomeProduto: produto.nome,
    precoVenda: Number(produto.preco_venda),
    margemDesejada: produto.markup_desejado
      ? Number(produto.markup_desejado)
      : margemPadrao,
    ingredientes: ((fichaResult.data ?? []) as FichaDetalhadaRow[]).map(mapIngrediente),
    insumos,
  };
}

export async function obterDadosNovoProduto(): Promise<FichaTecnicaInitialData> {
  const [insumos, margemPadrao] = await Promise.all([
    listarInsumosAtivos(),
    obterConfiguracaoMarkup(),
  ]);

  return {
    produtoId: null,
    nomeProduto: "",
    precoVenda: 0,
    margemDesejada: margemPadrao,
    ingredientes: [],
    insumos,
  };
}

export interface SalvarFichaTecnicaInput {
  produtoId: string | null;
  nomeProduto: string;
  precoVenda: number;
  margemDesejada: number;
  ingredientes: Array<{
    insumoId: string;
    quantidade: number;
  }>;
}

export async function salvarFichaTecnica(
  input: SalvarFichaTecnicaInput
): Promise<{ success: true; produtoId: string } | { success: false; error: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase não configurado. Verifique as variáveis de ambiente.",
    };
  }

  if (!input.nomeProduto.trim()) {
    return { success: false, error: "Informe o nome do produto." };
  }

  let produtoId = input.produtoId;

  if (produtoId) {
    const { error } = await supabase
      .from("produtos")
      .update({
        nome: input.nomeProduto.trim(),
        preco_venda: input.precoVenda,
        markup_desejado: input.margemDesejada,
      })
      .eq("id", produtoId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { data, error } = await supabase
      .from("produtos")
      .insert({
        nome: input.nomeProduto.trim(),
        preco_venda: input.precoVenda,
        markup_desejado: input.margemDesejada,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "Erro ao criar produto." };
    }

    produtoId = (data as { id: string }).id;
  }

  const { error: deleteError } = await supabase
    .from("ficha_tecnica")
    .delete()
    .eq("produto_id", produtoId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (input.ingredientes.length > 0) {
    const { error: insertError } = await supabase.from("ficha_tecnica").insert(
      input.ingredientes.map((item) => ({
        produto_id: produtoId!,
        insumo_id: item.insumoId,
        quantidade_utilizada: item.quantidade,
      }))
    );

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  return { success: true, produtoId };
}

export async function excluirProduto(
  produtoId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, error: "Supabase não configurado." };
  }

  const { error } = await supabase.from("produtos").delete().eq("id", produtoId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
