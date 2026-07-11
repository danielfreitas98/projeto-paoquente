import { createAdminClient } from "@/lib/supabase/admin";

export interface ConfiguracaoNegocio {
  id: string;
  nome_empresa: string;
  percentual_variaveis: number;
  percentual_fixas: number;
  percentual_lucro: number;
  taxa_cartao_debito: number;
  taxa_cartao_credito: number;
}

export async function obterConfiguracaoNegocio(): Promise<ConfiguracaoNegocio | null> {
  const client = createAdminClient();
  if (!client) return null;

  const { data, error } = await client
    .from("configuracao_negocio")
    .select(
      "id, nome_empresa, percentual_variaveis, percentual_fixas, percentual_lucro, taxa_cartao_debito, taxa_cartao_credito"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    percentual_variaveis: Number(data.percentual_variaveis),
    percentual_fixas: Number(data.percentual_fixas),
    percentual_lucro: Number(data.percentual_lucro),
    taxa_cartao_debito: Number(data.taxa_cartao_debito),
    taxa_cartao_credito: Number(data.taxa_cartao_credito),
  };
}
