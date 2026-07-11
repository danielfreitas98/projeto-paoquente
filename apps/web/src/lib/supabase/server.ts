import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function createClient() {
  const cookieStore = await cookies();

  const { supabaseUrl, supabaseAnonKey } = config.env;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase não configurado. Verifique as variáveis de ambiente.");
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorado em Server Components
          }
        },
      },
    }
  );
}
