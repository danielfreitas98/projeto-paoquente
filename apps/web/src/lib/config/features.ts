import { DEFAULT_FEATURE_FLAGS, ALL_MODULES } from "./defaults";
import { FeatureFlagsSchema, type AppModule, type FeatureFlags } from "./schema";

function readBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

function parseEnabledModules(): Set<AppModule> | null {
  const raw = process.env.NEXT_PUBLIC_ENABLED_MODULES;
  if (!raw || raw.trim() === "") return null;

  const modules = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return new Set(modules as AppModule[]);
}

export function loadFeatureFlags(): FeatureFlags {
  const enabledModules = parseEnabledModules();

  if (enabledModules) {
    const flags = Object.fromEntries(
      ALL_MODULES.map((module) => [module, enabledModules.has(module)])
    ) as FeatureFlags;

    return FeatureFlagsSchema.parse(flags);
  }

  const flags: FeatureFlags = {
    pdv: readBool("NEXT_PUBLIC_FEATURE_PDV", DEFAULT_FEATURE_FLAGS.pdv),
    produtos: readBool(
      "NEXT_PUBLIC_FEATURE_PRODUTOS",
      DEFAULT_FEATURE_FLAGS.produtos
    ),
    estoque: readBool(
      "NEXT_PUBLIC_FEATURE_ESTOQUE",
      DEFAULT_FEATURE_FLAGS.estoque
    ),
    financeiro: readBool(
      "NEXT_PUBLIC_FEATURE_FINANCEIRO",
      DEFAULT_FEATURE_FLAGS.financeiro
    ),
  };

  return FeatureFlagsSchema.parse(flags);
}

export function isModuleEnabled(
  features: FeatureFlags,
  module: AppModule
): boolean {
  return features[module];
}

export function getEnabledModules(features: FeatureFlags): AppModule[] {
  return ALL_MODULES.filter((module) => features[module]);
}
