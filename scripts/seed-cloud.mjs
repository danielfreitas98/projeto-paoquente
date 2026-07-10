import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../apps/web/.env.local");

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const INSUMOS_ESTOQUE = [
  { codigo: "INS-CL-001", descricao: "Farinha de Trigo", unidade_medida: "kg", estoque_atual: 50, estoque_minimo: 5, custo_medio: 4.5 },
  { codigo: "INS-CL-002", descricao: "Manteiga", unidade_medida: "kg", estoque_atual: 10, estoque_minimo: 1, custo_medio: 38.0 },
  { codigo: "INS-CL-003", descricao: "Açúcar", unidade_medida: "kg", estoque_atual: 25, estoque_minimo: 2.5, custo_medio: 5.0 },
  { codigo: "INS-CL-004", descricao: "Ovos", unidade_medida: "un", estoque_atual: 500, estoque_minimo: 50, custo_medio: 0.65 },
  { codigo: "INS-CL-005", descricao: "Leite Integral", unidade_medida: "l", estoque_atual: 30, estoque_minimo: 3, custo_medio: 4.8 },
  { codigo: "INS-CL-006", descricao: "Fermento Biológico", unidade_medida: "g", estoque_atual: 2000, estoque_minimo: 200, custo_medio: 0.022 },
  { codigo: "INS-CL-007", descricao: "Chocolate ao Leite", unidade_medida: "g", estoque_atual: 5000, estoque_minimo: 500, custo_medio: 0.055 },
  { codigo: "INS-CL-008", descricao: "Café em Grãos", unidade_medida: "g", estoque_atual: 10000, estoque_minimo: 1000, custo_medio: 0.08 },
];

const PRODUTOS = [
  { nome: "Croissant", preco_venda: 12.9, markup_desejado: 15.0 },
  { nome: "Pão de Queijo", preco_venda: 6.5, markup_desejado: 15.0 },
  { nome: "Cappuccino", preco_venda: 9.9, markup_desejado: 20.0 },
];

const FICHA_CROISSANT = [
  { insumo: "Farinha de Trigo", quantidade: 120 },
  { insumo: "Manteiga", quantidade: 45 },
  { insumo: "Fermento Biológico", quantidade: 8 },
];

console.log("Conectando em:", url);

const { data: config, error: configErr } = await supabase
  .from("configuracao_negocio")
  .select("nome_empresa")
  .limit(1);

if (configErr) {
  console.error("Erro de conexão:", configErr.message);
  process.exit(1);
}

console.log("Conectado! Empresa:", config?.[0]?.nome_empresa);

const { data: existingInsumos } = await supabase
  .from("estoque_produtos")
  .select("codigo")
  .eq("categoria", "INSUMO");
const existingInsumoCodes = new Set((existingInsumos ?? []).map((i) => i.codigo));
const insumosToInsert = INSUMOS_ESTOQUE.filter((i) => !existingInsumoCodes.has(i.codigo));

if (insumosToInsert.length > 0) {
  const { data, error } = await supabase
    .from("estoque_produtos")
    .insert(insumosToInsert.map((i) => ({ ...i, categoria: "INSUMO" })))
    .select("id, descricao");
  if (error) {
    console.error("Erro ao inserir insumos no estoque:", error.message);
    process.exit(1);
  }
  console.log(`Inseridos ${data.length} insumos:`, data.map((i) => i.descricao).join(", "));
} else {
  console.log("Insumos de estoque já existem, pulando inserção.");
}

const { data: existingProdutos } = await supabase.from("produtos").select("nome, id");
const existingProdutoNames = new Set((existingProdutos ?? []).map((p) => p.nome));
const produtosToInsert = PRODUTOS.filter((p) => !existingProdutoNames.has(p.nome));

if (produtosToInsert.length > 0) {
  const { data, error } = await supabase.from("produtos").insert(produtosToInsert).select("id, nome");
  if (error) {
    console.error("Erro ao inserir produtos:", error.message);
    process.exit(1);
  }
  console.log(`Inseridos ${data.length} produtos:`, data.map((p) => p.nome).join(", "));
} else {
  console.log("Produtos já existem, pulando inserção.");
}

const { data: allInsumos } = await supabase.from("insumos").select("id, nome");
const { data: croissant } = await supabase.from("produtos").select("id").eq("nome", "Croissant").maybeSingle();

if (croissant && allInsumos) {
  const insumoMap = Object.fromEntries(allInsumos.map((i) => [i.nome, i.id]));
  const fichaRows = FICHA_CROISSANT.map((f) => ({
    produto_id: croissant.id,
    insumo_id: insumoMap[f.insumo],
    quantidade_utilizada: f.quantidade,
  })).filter((r) => r.insumo_id);

  const { data: existingFicha } = await supabase
    .from("ficha_tecnica")
    .select("insumo_id")
    .eq("produto_id", croissant.id);

  const existingInsumoIds = new Set((existingFicha ?? []).map((f) => f.insumo_id));
  const fichaToInsert = fichaRows.filter((r) => !existingInsumoIds.has(r.insumo_id));

  if (fichaToInsert.length > 0) {
    const { error } = await supabase.from("ficha_tecnica").insert(fichaToInsert);
    if (error) {
      console.error("Erro ao inserir ficha técnica:", error.message);
      process.exit(1);
    }
    console.log(`Ficha técnica do Croissant: ${fichaToInsert.length} ingredientes adicionados.`);
  } else {
    console.log("Ficha técnica do Croissant já existe.");
  }
}

const { count: insCount } = await supabase.from("insumos").select("*", { count: "exact", head: true });
const { count: prodCount } = await supabase.from("produtos").select("*", { count: "exact", head: true });
const { data: termometro } = await supabase
  .from("vw_produto_termometro")
  .select("produto_nome, cmv, margem_bruta_percentual, termometro");

console.log("\n--- Resumo ---");
console.log(`Total insumos: ${insCount}`);
console.log(`Total produtos: ${prodCount}`);
console.log("Termômetro de lucro:");
for (const row of termometro ?? []) {
  console.log(
    `  ${row.produto_nome}: CMV R$${Number(row.cmv).toFixed(2)} | margem ${Number(row.margem_bruta_percentual).toFixed(1)}% | ${row.termometro}`
  );
}

console.log("\nSeed concluído com sucesso!");
