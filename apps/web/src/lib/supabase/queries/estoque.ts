import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type {
  ActionResult,
  CategoriaEstoque,
  EstoqueDashboard,
  Fornecedor,
  ItemNfeComVinculacao,
  LoteRefrigerado,
  LoteValidadeAlerta,
  MovimentacaoComProduto,
  NfeParsed,
  ProdutoEstoque,
  TipoMovimentacaoEstoque,
} from "@/types/estoque";
import type { ProdutoEstoqueFormData, MovimentacaoFormData } from "@/lib/estoque/schemas";

function getClient() {
  const client = createAdminClient();
  if (!client) throw new Error("Supabase não configurado");
  if (!hasServiceRoleKey()) throw new Error("SUPABASE_SERVICE_ROLE_KEY necessária para operações de escrita");
  return client;
}

function getReadClient() {
  const client = createAdminClient();
  if (!client) throw new Error("Supabase não configurado");
  return client;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function obterDashboardEstoque(): Promise<EstoqueDashboard> {
  const client = getReadClient();
  const { data, error } = await client
    .from("vw_estoque_dashboard")
    .select("*")
    .single();

  if (error || !data) {
    return {
      total_produtos: 0,
      estoque_baixo: 0,
      produtos_refrigerados: 0,
      alertas_validade: 0,
    };
  }

  return {
    total_produtos: Number(data.total_produtos ?? 0),
    estoque_baixo: Number(data.estoque_baixo ?? 0),
    produtos_refrigerados: Number(data.produtos_refrigerados ?? 0),
    alertas_validade: Number(data.alertas_validade ?? 0),
  };
}

export async function listarAlertasValidade(): Promise<LoteValidadeAlerta[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("vw_lotes_validade_alerta")
    .select("*")
    .order("data_validade", { ascending: true });

  if (error || !data) return [];
  return data as LoteValidadeAlerta[];
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------
export interface ListarProdutosFiltros {
  busca?: string;
  categoria?: CategoriaEstoque | "TODAS";
  incluirInativos?: boolean;
}

export async function listarProdutosEstoque(
  filtros: ListarProdutosFiltros = {}
): Promise<ProdutoEstoque[]> {
  const client = getReadClient();
  let query = client
    .from("estoque_produtos")
    .select("*")
    .order("descricao", { ascending: true });

  if (!filtros.incluirInativos) {
    query = query.eq("ativo", true);
  }

  if (filtros.categoria && filtros.categoria !== "TODAS") {
    query = query.eq("categoria", filtros.categoria);
  }

  if (filtros.busca?.trim()) {
    const termo = `%${filtros.busca.trim()}%`;
    query = query.or(`codigo.ilike.${termo},descricao.ilike.${termo}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ProdutoEstoque[];
}

export async function obterProdutoEstoque(id: string): Promise<ProdutoEstoque | null> {
  const client = getReadClient();
  const { data, error } = await client
    .from("estoque_produtos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ProdutoEstoque;
}

export async function criarProdutoEstoque(
  input: ProdutoEstoqueFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from("estoque_produtos")
      .insert({
        codigo: input.codigo.trim(),
        descricao: input.descricao.trim(),
        categoria: input.categoria,
        unidade_medida: input.unidade_medida,
        estoque_minimo: input.estoque_minimo,
        custo_medio: input.custo_medio ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return { success: false, error: "Código de produto já cadastrado." };
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: data.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao criar produto" };
  }
}

export async function atualizarProdutoEstoque(
  id: string,
  input: ProdutoEstoqueFormData
): Promise<ActionResult> {
  try {
    const client = getClient();
    const { error } = await client
      .from("estoque_produtos")
      .update({
        codigo: input.codigo.trim(),
        descricao: input.descricao.trim(),
        categoria: input.categoria,
        unidade_medida: input.unidade_medida,
        estoque_minimo: input.estoque_minimo,
        custo_medio: input.custo_medio ?? 0,
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") return { success: false, error: "Código de produto já cadastrado." };
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao atualizar produto" };
  }
}

export async function excluirProdutoEstoque(id: string): Promise<ActionResult> {
  try {
    const client = getClient();
    const { error } = await client
      .from("estoque_produtos")
      .update({ ativo: false })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao excluir produto" };
  }
}

// ---------------------------------------------------------------------------
// Movimentações
// ---------------------------------------------------------------------------
export async function listarMovimentacoes(limite = 20): Promise<MovimentacaoComProduto[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("movimentacoes_estoque")
    .select(`
      *,
      estoque_produtos!inner (codigo, descricao, unidade_medida)
    `)
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error || !data) return [];

  return data.map((row) => {
    const produto = row.estoque_produtos as {
      codigo: string;
      descricao: string;
      unidade_medida: string;
    };
    const { estoque_produtos: _, ...mov } = row;
    return {
      ...(mov as Omit<MovimentacaoComProduto, "produto_codigo" | "produto_descricao" | "produto_unidade">),
      produto_codigo: produto.codigo,
      produto_descricao: produto.descricao,
      produto_unidade: produto.unidade_medida as MovimentacaoComProduto["produto_unidade"],
    };
  });
}

export async function registrarMovimentacao(
  input: MovimentacaoFormData
): Promise<ActionResult> {
  try {
    const client = getClient();

    const produto = await obterProdutoEstoque(input.produto_id);
    if (!produto) return { success: false, error: "Produto não encontrado." };

    let loteId: string | null = null;

    if (
      produto.categoria === "REFRIGERADO" &&
      input.tipo === "ENTRADA" &&
      input.lote &&
      input.data_validade
    ) {
      const { data: loteExistente } = await client
        .from("lotes_refrigerados")
        .select("id")
        .eq("produto_id", input.produto_id)
        .eq("lote", input.lote)
        .maybeSingle();

      if (loteExistente) {
        const { data: loteAtual } = await client
          .from("lotes_refrigerados")
          .select("quantidade")
          .eq("id", loteExistente.id)
          .single();

        const { error: loteErr } = await client
          .from("lotes_refrigerados")
          .update({
            quantidade: Number(loteAtual?.quantidade ?? 0) + input.quantidade,
            data_fabricacao: input.data_fabricacao || null,
            data_validade: input.data_validade,
          })
          .eq("id", loteExistente.id);
        if (loteErr) return { success: false, error: loteErr.message };
        loteId = loteExistente.id;
      } else {
        const { data: novoLote, error: loteErr } = await client
          .from("lotes_refrigerados")
          .insert({
            produto_id: input.produto_id,
            lote: input.lote,
            quantidade: input.quantidade,
            data_fabricacao: input.data_fabricacao || null,
            data_validade: input.data_validade,
          })
          .select("id")
          .single();
        if (loteErr) return { success: false, error: loteErr.message };
        loteId = novoLote.id;
      }
    }

    const { error } = await client.from("movimentacoes_estoque").insert({
      produto_id: input.produto_id,
      tipo: input.tipo as TipoMovimentacaoEstoque,
      quantidade: input.quantidade,
      custo_unitario: input.custo_unitario ?? 0,
      observacao: input.observacao || null,
      usuario: input.usuario || null,
      lote_id: loteId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao registrar movimentação" };
  }
}

// ---------------------------------------------------------------------------
// Lotes refrigerados
// ---------------------------------------------------------------------------
export async function listarLotesPorProduto(produtoId: string): Promise<LoteRefrigerado[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("lotes_refrigerados")
    .select("*")
    .eq("produto_id", produtoId)
    .eq("ativo", true)
    .order("data_validade", { ascending: true });

  if (error || !data) return [];
  return data as LoteRefrigerado[];
}

// ---------------------------------------------------------------------------
// NF-e / XML
// ---------------------------------------------------------------------------
export async function verificarNotaJaImportada(chaveNfe: string): Promise<boolean> {
  const client = getReadClient();
  const { data } = await client
    .from("notas_fiscais")
    .select("id")
    .eq("chave_nfe", chaveNfe)
    .maybeSingle();
  return Boolean(data);
}

export async function resolverVinculacoesItens(
  nfe: NfeParsed
): Promise<ItemNfeComVinculacao[]> {
  const client = getReadClient();
  const descricoes = nfe.itens.map((i) => i.descricao);

  const { data: vinculacoes } = await client
    .from("vinculacao_produtos_xml")
    .select("descricao_xml, produto_id")
    .in("descricao_xml", descricoes);

  const mapa = new Map(
    (vinculacoes ?? []).map((v) => [v.descricao_xml, v.produto_id])
  );

  return nfe.itens.map((item) => ({
    ...item,
    produtoId: mapa.get(item.descricao) ?? null,
    vinculacaoExistente: mapa.has(item.descricao),
  }));
}

export async function salvarVinculacaoXml(
  descricaoXml: string,
  produtoId: string
): Promise<ActionResult> {
  try {
    const client = getClient();
    const { error } = await client.from("vinculacao_produtos_xml").upsert(
      { descricao_xml: descricaoXml, produto_id: produtoId },
      { onConflict: "descricao_xml" }
    );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao salvar vinculação" };
  }
}

export interface ImportarNfeInput {
  nfe: NfeParsed;
  xmlOriginal: string;
  itensVinculados: Array<{
    descricao: string;
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    codigo: string | null;
  }>;
  usuario?: string;
}

export async function importarNotaFiscal(
  input: ImportarNfeInput
): Promise<ActionResult<{ notaFiscalId: string }>> {
  try {
    const client = getClient();

    const jaImportada = await verificarNotaJaImportada(input.nfe.chaveNfe);
    if (jaImportada) {
      return { success: false, error: "Esta NF-e já foi importada anteriormente." };
    }

    let fornecedorId: string;
    const { data: fornecedorExistente } = await client
      .from("fornecedores")
      .select("id")
      .eq("cnpj", input.nfe.fornecedorCnpj)
      .maybeSingle();

    if (fornecedorExistente) {
      fornecedorId = fornecedorExistente.id;
    } else {
      const { data: novoFornecedor, error: fornErr } = await client
        .from("fornecedores")
        .insert({
          cnpj: input.nfe.fornecedorCnpj,
          razao_social: input.nfe.fornecedorRazaoSocial,
        })
        .select("id")
        .single();
      if (fornErr) return { success: false, error: fornErr.message };
      fornecedorId = novoFornecedor.id;
    }

    const { data: nota, error: notaErr } = await client
      .from("notas_fiscais")
      .insert({
        chave_nfe: input.nfe.chaveNfe,
        numero_nota: input.nfe.numeroNota,
        fornecedor_id: fornecedorId,
        data_emissao: input.nfe.dataEmissao,
        valor_total: input.nfe.valorTotal,
        xml_original: input.xmlOriginal,
      })
      .select("id")
      .single();

    if (notaErr) return { success: false, error: notaErr.message };

    for (const item of input.itensVinculados) {
      await client.from("vinculacao_produtos_xml").upsert(
        { descricao_xml: item.descricao, produto_id: item.produtoId },
        { onConflict: "descricao_xml" }
      );

      await client.from("itens_nota_fiscal").insert({
        nota_fiscal_id: nota.id,
        produto_id: item.produtoId,
        codigo_fornecedor: item.codigo,
        descricao_xml: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
      });

      await client.from("movimentacoes_estoque").insert({
        produto_id: item.produtoId,
        tipo: "ENTRADA",
        quantidade: item.quantidade,
        custo_unitario: item.valorUnitario,
        observacao: `Entrada automática via NF-e ${input.nfe.numeroNota}`,
        usuario: input.usuario || null,
        nota_fiscal_id: nota.id,
      });
    }

    return { success: true, data: { notaFiscalId: nota.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro ao importar NF-e" };
  }
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const client = getReadClient();
  const { data, error } = await client
    .from("fornecedores")
    .select("*")
    .order("razao_social");

  if (error || !data) return [];
  return data as Fornecedor[];
}
