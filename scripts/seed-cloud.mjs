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

const INSUMOS = [
  { nome: "Farinha de Trigo", unidade_medida: "g", preco_compra: 4.5, quantidade_compra: 1000 },
  { nome: "Manteiga", unidade_medida: "g", preco_compra: 19.0, quantidade_compra: 500 },
  { nome: "Açúcar", unidade_medida: "g", preco_compra: 5.0, quantidade_compra: 1000 },
  { nome: "Ovos", unidade_medida: "un", preco_compra: 0.65, quantidade_compra: 1 },
  { nome: "Leite Integral", unidade_medida: "ml", preco_compra: 4.8, quantidade_compra: 1000 },
  { nome: "Fermento Biológico", unidade_medida: "g", preco_compra: 2.2, quantidade_compra: 100 },
  { nome: "Chocolate ao Leite", unidade_medida: "g", preco_compra: 11.0, quantidade_compra: 200 },
  { nome: "Café em Grãos", unidade_medida: "g", preco_compra: 40.0, quantidade_compra: 500 },
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

const { data: existingInsumos } = await supabase.from("insumos").select("nome");
const existingInsumoNames = new Set((existingInsumos ?? []).map((i) => i.nome));
const insumosToInsert = INSUMOS.filter((i) => !existingInsumoNames.has(i.nome));

if (insumosToInsert.length > 0) {
  const { data, error } = await supabase.from("insumos").insert(insumosToInsert).select("id, nome");
  if (error) {
    console.error("Erro ao inserir insumos:", error.message);
    process.exit(1);
  }
  console.log(`Inseridos ${data.length} insumos:`, data.map((i) => i.nome).join(", "));
} else {
  console.log("Insumos já existem, pulando inserção.");
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
