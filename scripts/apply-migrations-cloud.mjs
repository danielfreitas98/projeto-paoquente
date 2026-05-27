import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../apps/web/.env.local");
const migrationsDir = resolve(__dirname, "../supabase/migrations");
const PROJECT_REF = "gfrjyhletwzhmdhjhfhp";
const CLOUD_MIGRATION = "20250524120003_idempotent_cloud.sql";

function loadEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`Arquivo não encontrado: ${path}`);
  }

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

function buildDbUrls(password) {
  const encoded = encodeURIComponent(password);
  const host = `aws-0-sa-east-1.pooler.supabase.com`;
  return [
    `postgresql://postgres.${PROJECT_REF}:${encoded}@${host}:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${encoded}@${host}:5432/postgres`,
    `postgresql://postgres:${encoded}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ];
}

async function applyWithManagementApi(accessToken, sql) {
  console.log(`Aplicando ${CLOUD_MIGRATION} via Management API...`);

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }

  console.log("  OK");
  return true;
}

async function applyWithPg(dbUrls, sql) {
  const { default: pg } = await import("pg");
  let lastError = null;

  for (const connectionString of dbUrls) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      console.log(`Aplicando ${CLOUD_MIGRATION} via Postgres...`);
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("  OK");
      return true;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // ignore disconnect errors
      }
    }
  }

  throw lastError;
}

async function verifyViews(env) {
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
    console.log(`  ${view}: ${error ? `AUSENTE (${error.message})` : "OK"}`);
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
  } else if (error) {
    console.warn("\nView vw_produto_termometro ainda indisponível:", error.message);
  }
}

try {
  const env = loadEnv(envPath);
  const sql = readFileSync(join(migrationsDir, CLOUD_MIGRATION), "utf8");
  const accessToken =
    process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
  const dbPassword =
    process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;

  let applied = false;

  if (accessToken) {
    applied = await applyWithManagementApi(accessToken, sql);
  } else if (dbUrl || dbPassword) {
    const dbUrls = dbUrl ? [dbUrl] : buildDbUrls(dbPassword);
    applied = await applyWithPg(dbUrls, sql);
  }

  if (!applied) {
    console.error(
      "Credencial de banco ausente. Adicione em apps/web/.env.local uma das opções:\n"
    );
    console.error("  SUPABASE_ACCESS_TOKEN=...  (Dashboard → Account → Access Tokens)");
    console.error("  SUPABASE_DB_PASSWORD=...    (Dashboard → Project Settings → Database)\n");
    console.error("Alternativa manual: SQL Editor do Supabase → executar:");
    console.error(`  supabase/migrations/${CLOUD_MIGRATION}`);
    process.exit(1);
  }

  console.log("\nMigration cloud aplicada com sucesso!");
  await verifyViews(env);
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
}
