import { createBrowserClient } from "@supabase/ssr";
import { config } from "@/lib/config";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = config.env;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado. Verifique as variáveis de ambiente.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
