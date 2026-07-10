import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FichaDetalhadaRow,
  ProdutoRow,
  ProdutoTermometroRow,
} from "@/types/database";
import type { Insumo, IngredienteFicha } from "@/lib/ficha-tecnica/calculations";
import {
  mapEstoqueProdutoParaInsumo,
} from "@/lib/ficha-tecnica/insumo-mapper";
import {
  calcularMarkupMultiplicador,
  calcularMargemReal,
  classificarTermometro,
  CONFIG_MARKUP_PADRAO,
} from "@/lib/ficha-tecnica/calculations";

let viewsDisponiveis: boolean | null = null;

async function viewsTermometroDisponiveis(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<boolean> {
  if (viewsDisponiveis !== null) return viewsDisponiveis;

  const { error } = await supabase
    .from("vw_produto_termometro")
    .select("produto_id")
    .limit(1);

  viewsDisponiveis = !error;
  if (error) {
    console.warn(
      "Views de produto indisponíveis; usando fallback nas tabelas base.",
      error.message
    );
  }

  return viewsDisponiveis;
}

export interface FichaTecnicaInitialData {
  produtoId: string | null;
  nomeProduto: string;
  precoVenda: number;
  margemDesejada: number;
  ingredientes: IngredienteFicha[];
  insumos: Insumo[];
}

async function listarInsumosEstoqueMap(): Promise<Map<string, Insumo>> {
  const supabase = createAdminClient();
  const map = new Map<string, Insumo>();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("estoque_produtos")
    .select("id, descricao, unidade_medida, custo_medio")
    .eq("categoria", "INSUMO")
    .eq("ativo", true);

  if (error) {
    console.error("listarInsumosEstoqueMap:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const insumo = mapEstoqueProdutoParaInsumo(row);
    map.set(insumo.id, insumo);
  }

  return map;
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

async function obterConfiguracaoMarkupCompleta() {
  const supabase = createAdminClient();
  if (!supabase) return CONFIG_MARKUP_PADRAO;

  const { data, error } = await supabase
    .from("configuracao_negocio")
    .select("percentual_variaveis, percentual_fixas, percentual_lucro")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error || !data) return CONFIG_MARKUP_PADRAO;

  return {
    percentualVariaveis: Number(data.percentual_variaveis),
    percentualFixas: Number(data.percentual_fixas),
    percentualLucro: Number(data.percentual_lucro),
  };
}

async function listarProdutosComTermometroFallback(): Promise<
  ProdutoTermometroRow[]
> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const [produtosResult, fichaResult, insumosMap, config] = await Promise.all([
    supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
    supabase
      .from("ficha_tecnica")
      .select("produto_id, insumo_id, quantidade_utilizada"),
    listarInsumosEstoqueMap(),
    obterConfiguracaoMarkupCompleta(),
  ]);

  if (produtosResult.error || !produtosResult.data) {
    console.error(
      "listarProdutosComTermometroFallback:",
      produtosResult.error?.message
    );
    return [];
  }

  const markupMult = calcularMarkupMultiplicador(
    config.percentualVariaveis,
    config.percentualFixas,
    config.percentualLucro
  );

  const cmvPorProduto = new Map<string, number>();
  for (const row of fichaResult.data ?? []) {
    const insumo = insumosMap.get(row.insumo_id as string);
    if (!insumo) continue;

    const produtoId = row.produto_id as string;
    const linhaCmv = Number(row.quantidade_utilizada) * insumo.custoUnitario;
    cmvPorProduto.set(produtoId, (cmvPorProduto.get(produtoId) ?? 0) + linhaCmv);
  }

  return (produtosResult.data as ProdutoRow[]).map((produto) => {
    const precoVenda = Number(produto.preco_venda);
    const cmv = cmvPorProduto.get(produto.id) ?? 0;
    const margemDesejada = produto.markup_desejado
      ? Number(produto.markup_desejado)
      : config.percentualLucro;
    const margemBruta = calcularMargemReal(precoVenda, cmv);

    return {
      produto_id: produto.id,
      produto_nome: produto.nome,
      preco_venda: precoVenda,
      markup_desejado: produto.markup_desejado
        ? Number(produto.markup_desejado)
        : null,
      cmv,
      margem_bruta_percentual: Math.round(margemBruta * 100) / 100,
      preco_sugerido: Math.round(cmv * markupMult * 100) / 100,
      termometro: classificarTermometro(margemBruta, margemDesejada),
    };
  });
}

async function listarFichaTecnicaDetalhadaFallback(
  produtoId: string
): Promise<IngredienteFicha[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const [fichaResult, insumosMap] = await Promise.all([
    supabase
      .from("ficha_tecnica")
      .select("id, insumo_id, quantidade_utilizada")
      .eq("produto_id", produtoId),
    listarInsumosEstoqueMap(),
  ]);

  if (fichaResult.error || !fichaResult.data) {
    console.error("listarFichaTecnicaDetalhadaFallback:", fichaResult.error?.message);
    return [];
  }

  return fichaResult.data.flatMap((row) => {
    const insumo = insumosMap.get(row.insumo_id as string);
    if (!insumo) return [];

    return [
      {
        id: row.id as string,
        insumoId: insumo.id,
        nome: insumo.nome,
        unidadeMedida: insumo.unidadeMedida,
        quantidade: Number(row.quantidade_utilizada),
        custoUnitario: insumo.custoUnitario,
      },
    ];
  });
}

export async function listarProdutosComTermometro(): Promise<
  ProdutoTermometroRow[]
> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  if (!(await viewsTermometroDisponiveis(supabase))) {
    return listarProdutosComTermometroFallback();
  }

  const { data, error } = await supabase
    .from("vw_produto_termometro")
    .select("*")
    .order("produto_nome");

  if (!error) {
    return (data ?? []) as ProdutoTermometroRow[];
  }

  viewsDisponiveis = false;
  console.warn(
    "listarProdutosComTermometro: erro na view, usando fallback.",
    error.message
  );
  return listarProdutosComTermometroFallback();
}

export async function listarInsumosAtivos(): Promise<Insumo[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("estoque_produtos")
    .select("id, descricao, unidade_medida, custo_medio")
    .eq("categoria", "INSUMO")
    .eq("ativo", true)
    .order("descricao");

  if (error) {
    console.error("listarInsumosAtivos:", error.message);
    return [];
  }

  return (data ?? []).map(mapEstoqueProdutoParaInsumo);
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
  const ingredientes = fichaResult.error
    ? await listarFichaTecnicaDetalhadaFallback(produtoId)
    : ((fichaResult.data ?? []) as FichaDetalhadaRow[]).map(mapIngrediente);

  if (fichaResult.error) {
    console.warn(
      "obterFichaTecnicaPorProduto: view indisponível, usando fallback.",
      fichaResult.error.message
    );
  }

  return {
    produtoId: produto.id,
    nomeProduto: produto.nome,
    precoVenda: Number(produto.preco_venda),
    margemDesejada: produto.markup_desejado
      ? Number(produto.markup_desejado)
      : margemPadrao,
    ingredientes,
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
