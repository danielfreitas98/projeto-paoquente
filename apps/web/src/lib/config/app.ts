import { DEFAULT_APP_SETTINGS } from "./defaults";
import { AppSettingsSchema, type AppSettings } from "./schema";

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

function readNumber(key: string, defaultValue: number): number {
  const value = readEnv(key);
  if (value === undefined) return defaultValue;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function loadAppSettings(): AppSettings {
  const raw = {
    nomeEmpresa: readEnv("NEXT_PUBLIC_NOME_EMPRESA") ?? DEFAULT_APP_SETTINGS.nomeEmpresa,
    nomeApp: readEnv("NEXT_PUBLIC_NOME_APP") ?? DEFAULT_APP_SETTINGS.nomeApp,
    cmvAlvoPadrao: readNumber(
      "NEXT_PUBLIC_CMV_ALVO_PADRAO",
      DEFAULT_APP_SETTINGS.cmvAlvoPadrao
    ),
    margemAmarelaPp: readNumber(
      "NEXT_PUBLIC_MARGEM_AMARELA_PP",
      DEFAULT_APP_SETTINGS.margemAmarelaPp
    ),
  };

  return AppSettingsSchema.parse(raw);
}
