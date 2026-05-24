import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../apps/web/.env.local");
const migrationsDir = resolve(__dirname, "../supabase/migrations");
const PROJECT_REF = "gfrjyhletwzhmdhjhfhp";

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
const accessToken =
  process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const dbPassword =
  process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
const dbUrl =
  process.env.SUPABASE_DB_URL ||
  env.SUPABASE_DB_URL ||
  (dbPassword
    ? `postgresql://postgres.gfrjyhletwzhmdhjhfhp:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
    : null);

function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .slice(1);
}

async function applyWithManagementApi() {
  if (!accessToken) return false;

  for (const file of migrationFiles()) {
    const query = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Aplicando ${file} via Management API...`);

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${file}: ${response.status} ${body}`);
    }

    console.log("  OK");
  }

  return true;
}

async function applyWithPg() {
  if (!dbUrl) return false;

  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  for (const file of migrationFiles()) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Aplicando ${file} via Postgres...`);
    await client.query(sql);
    console.log("  OK");
  }

  await client.end();
  return true;
}

async function verifyViews() {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const views = [
    "vw_produto_cmv",
    "vw_produto_termometro",
    "vw_ficha_tecnica_detalhada",
    "vw_fluxo_caixa_mensal",
  ];

  console.log("\nVerificando views:");
  for (const view of views) {
    const { error } = await supabase.from(view).select("*").limit(1);
    console.log(`  ${view}: ${error ? "AUSENTE" : "OK"}`);
  }

  const { data, error } = await supabase
    .from("vw_produto_termometro")
    .select("produto_nome, cmv, preco_venda, termometro")
    .order("produto_nome");

  if (!error && data?.length) {
    console.log("\nProdutos na view:");
    for (const row of data) {
      console.log(
        `  ${row.produto_nome} | CMV R$${Number(row.cmv).toFixed(2)} | ${row.termometro}`
      );
    }
  }
}

try {
  const applied =
    (await applyWithManagementApi()) || (await applyWithPg());

  if (!applied) {
    console.error(
      "Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_PASSWORD para aplicar migrations.\n"
    );
    console.error("Alternativa: SQL Editor do Supabase → executar:");
    for (const file of migrationFiles()) {
      console.error(`  supabase/migrations/${file}`);
    }
    process.exit(1);
  }

  console.log("\nMigrations aplicadas com sucesso!");
  await verifyViews();
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
}
