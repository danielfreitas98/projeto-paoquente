import { EnvConfigSchema, type EnvConfig } from "./schema";

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

function readBool(key: string, defaultValue: boolean): boolean {
  const value = readEnv(key);
  if (value === undefined) return defaultValue;

  const normalized = value.toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

function readNodeEnv(): EnvConfig["nodeEnv"] {
  const value = readEnv("NODE_ENV");
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }
  return "development";
}

export function loadEnvConfig(): EnvConfig {
  const raw = {
    nodeEnv: readNodeEnv(),
    supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    useMockData: readBool("USE_MOCK_DATA", false),
    debug: readBool("DEBUG", readNodeEnv() === "development"),
  };

  return EnvConfigSchema.parse(raw);
}

export function isSupabaseConfigured(env: EnvConfig): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasServiceRoleKey(env: EnvConfig): boolean {
  return Boolean(env.supabaseServiceRoleKey);
}
