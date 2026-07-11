import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  config,
  hasServiceRoleKey as configHasServiceRoleKey,
  isSupabaseConfigured as configIsSupabaseConfigured,
} from "@/lib/config";

function createClientWithKey(key: string) {
  const url = config.env.supabaseUrl;
  if (!url) return null;

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAdminClient() {
  const serviceRoleKey = config.env.supabaseServiceRoleKey;
  if (serviceRoleKey) {
    return createClientWithKey(serviceRoleKey);
  }

  const anonKey = config.env.supabaseAnonKey;
  if (anonKey) {
    return createClientWithKey(anonKey);
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return configIsSupabaseConfigured(config.env);
}

export function hasServiceRoleKey(): boolean {
  return configHasServiceRoleKey(config.env);
}
