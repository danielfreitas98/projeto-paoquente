import { loadAppSettings } from "./app";
import { ALL_MODULES, MODULE_ROUTES } from "./defaults";
import {
  hasServiceRoleKey,
  isSupabaseConfigured,
  loadEnvConfig,
} from "./env";
import { getEnabledModules, isModuleEnabled, loadFeatureFlags } from "./features";
import {
  AppConfigSchema,
  PublicConfigSchema,
  type AppConfig,
  type AppModule,
  type FeatureFlags,
  type PublicConfig,
} from "./schema";

function buildConfig(): AppConfig {
  const env = loadEnvConfig();
  const features = loadFeatureFlags();
  const app = loadAppSettings();

  return AppConfigSchema.parse({ env, features, app });
}

function buildPublicConfig(config: AppConfig): PublicConfig {
  return PublicConfigSchema.parse({
    features: config.features,
    app: config.app,
    isDevelopment: config.env.nodeEnv === "development",
    isProduction: config.env.nodeEnv === "production",
  });
}

const config = buildConfig();
const publicConfig = buildPublicConfig(config);

export { config, publicConfig };

export type {
  AppConfig,
  AppModule,
  AppSettings,
  EnvConfig,
  FeatureFlags,
  PublicConfig,
} from "./schema";

export {
  ALL_MODULES,
  DEFAULT_APP_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
  MODULE_ROUTES,
} from "./defaults";

export { getEnabledModules, isModuleEnabled, loadFeatureFlags } from "./features";
export { loadAppSettings } from "./app";
export {
  hasServiceRoleKey,
  isSupabaseConfigured,
  loadEnvConfig,
} from "./env";

export function getConfig(): AppConfig {
  return config;
}

export function getPublicConfig(): PublicConfig {
  return publicConfig;
}

export function shouldUseMockData(): boolean {
  if (config.env.useMockData) return true;
  return !isSupabaseConfigured(config.env);
}

export function isModuleRouteEnabled(pathname: string): boolean {
  for (const module of ALL_MODULES) {
    const route = MODULE_ROUTES[module];
    if (pathname === route.href || pathname.startsWith(`${route.href}/`)) {
      return isModuleEnabled(config.features, module);
    }
  }
  return true;
}

export function getEnabledModuleRoutes() {
  return getEnabledModules(config.features).map((module) => ({
    module,
    ...MODULE_ROUTES[module],
  }));
}
