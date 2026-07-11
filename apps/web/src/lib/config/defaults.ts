import type { AppModule, AppSettings, FeatureFlags } from "./schema";

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  pdv: true,
  produtos: true,
  estoque: true,
  financeiro: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  nomeEmpresa: "Pão Quente",
  nomeApp: "CRM Padarias",
  cmvAlvoPadrao: 30,
  margemAmarelaPp: 5,
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
