import type { AppModule, AppSettings, FeatureFlags, PdvSettings } from "./schema";

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  pdv: true,
  produtos: true,
  estoque: true,
  financeiro: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  nomeEmpresa: "Pão Quente",
  nomeApp: "SWM - CRM",
  cmvAlvoPadrao: 30,
  margemAmarelaPp: 5,
  desenvolvedorNome: "BroTech",
  desenvolvedorCnpj: "36.319.268/0001-38",
  desenvolvedorContato: "+55 38 2200-0600",
};

export const DEFAULT_PDV_SETTINGS: PdvSettings = {
  tamanhoPapelImpressao: "80mm",
  imprimirCupomAutomatico: false,
  mensagemRodapeCupom: "Obrigado pela preferência!",
  modoImpressao: "agente",
  printAgentUrl: "http://127.0.0.1:9333",
  nomeImpressoraPadrao: "",
};

export const MODULE_ROUTES: Record<
  AppModule,
  { href: string; label: string }
> = {
  pdv: { href: "/pdv", label: "PDV" },
  produtos: { href: "/produtos", label: "Produtos" },
  estoque: { href: "/estoque", label: "Estoque" },
  financeiro: { href: "/financeiro", label: "Financeiro" },
};

export const ALL_MODULES: AppModule[] = [
  "pdv",
  "produtos",
  "estoque",
  "financeiro",
];
