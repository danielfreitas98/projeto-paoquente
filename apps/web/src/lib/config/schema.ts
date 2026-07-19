import { z } from "zod";

export const AppModuleSchema = z.enum([
  "pdv",
  "produtos",
  "estoque",
  "financeiro",
]);

export type AppModule = z.infer<typeof AppModuleSchema>;

export const FeatureFlagsSchema = z.object({
  pdv: z.boolean(),
  produtos: z.boolean(),
  estoque: z.boolean(),
  financeiro: z.boolean(),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const AppSettingsSchema = z.object({
  nomeEmpresa: z.string().min(1),
  nomeApp: z.string().min(1),
  cmvAlvoPadrao: z.number().min(1).max(99),
  margemAmarelaPp: z.number().min(0).max(50),
  desenvolvedorNome: z.string().min(1),
  desenvolvedorCnpj: z.string().min(1),
  desenvolvedorContato: z.string().min(1),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const TamanhoPapelImpressaoSchema = z.enum(["80mm", "58mm"]);

export type TamanhoPapelImpressao = z.infer<typeof TamanhoPapelImpressaoSchema>;

export const ModoImpressaoSchema = z.enum(["agente", "navegador"]);

export type ModoImpressao = z.infer<typeof ModoImpressaoSchema>;

export const PdvSettingsSchema = z.object({
  tamanhoPapelImpressao: TamanhoPapelImpressaoSchema,
  imprimirCupomAutomatico: z.boolean(),
  mensagemRodapeCupom: z.string(),
  modoImpressao: ModoImpressaoSchema,
  printAgentUrl: z.string().url(),
  nomeImpressoraPadrao: z.string(),
});

export type PdvSettings = z.infer<typeof PdvSettingsSchema>;

export const EnvConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]),
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
  supabaseServiceRoleKey: z.string().min(1).optional(),
  useMockData: z.boolean(),
  debug: z.boolean(),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export const AppConfigSchema = z.object({
  env: EnvConfigSchema,
  features: FeatureFlagsSchema,
  app: AppSettingsSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const PublicConfigSchema = z.object({
  features: FeatureFlagsSchema,
  app: AppSettingsSchema,
  pdv: PdvSettingsSchema,
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
});

export type PublicConfig = z.infer<typeof PublicConfigSchema>;
