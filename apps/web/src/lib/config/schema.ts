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
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

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
  isDevelopment: z.boolean(),
  isProduction: z.boolean(),
});

export type PublicConfig = z.infer<typeof PublicConfigSchema>;
