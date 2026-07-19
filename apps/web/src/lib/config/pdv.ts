import { DEFAULT_PDV_SETTINGS } from "./defaults";
import {
  ModoImpressaoSchema,
  PdvSettingsSchema,
  TamanhoPapelImpressaoSchema,
  type PdvSettings,
} from "./schema";

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

function readBoolean(key: string, defaultValue: boolean): boolean {
  const value = readEnv(key);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

function readTamanhoPapel(value: string | undefined): PdvSettings["tamanhoPapelImpressao"] {
  const parsed = TamanhoPapelImpressaoSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_PDV_SETTINGS.tamanhoPapelImpressao;
}

function readModoImpressao(value: string | undefined): PdvSettings["modoImpressao"] {
  const parsed = ModoImpressaoSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_PDV_SETTINGS.modoImpressao;
}

export function loadPdvSettings(): PdvSettings {
  const raw = {
    tamanhoPapelImpressao: readTamanhoPapel(
      readEnv("NEXT_PUBLIC_PDV_TAMANHO_PAPEL")
    ),
    imprimirCupomAutomatico: readBoolean(
      "NEXT_PUBLIC_PDV_IMPRIMIR_CUPOM_AUTOMATICO",
      DEFAULT_PDV_SETTINGS.imprimirCupomAutomatico
    ),
    mensagemRodapeCupom:
      readEnv("NEXT_PUBLIC_PDV_MENSAGEM_RODAPE") ??
      DEFAULT_PDV_SETTINGS.mensagemRodapeCupom,
    modoImpressao: readModoImpressao(readEnv("NEXT_PUBLIC_PDV_MODO_IMPRESSAO")),
    printAgentUrl:
      readEnv("NEXT_PUBLIC_PDV_PRINT_AGENT_URL") ??
      DEFAULT_PDV_SETTINGS.printAgentUrl,
    nomeImpressoraPadrao:
      readEnv("NEXT_PUBLIC_PDV_NOME_IMPRESSORA") ??
      DEFAULT_PDV_SETTINGS.nomeImpressoraPadrao,
  };

  return PdvSettingsSchema.parse(raw);
}
