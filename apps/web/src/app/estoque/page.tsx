import { AlertCircle } from "lucide-react";
import { DashboardCards } from "@/components/estoque/dashboard-cards";
import { AlertasValidade } from "@/components/estoque/alertas-validade";
import { MovimentacoesTable } from "@/components/estoque/movimentacoes-table";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  obterDashboardEstoque,
  listarAlertasValidade,
  listarMovimentacoes,
} from "@/lib/supabase/queries/estoque";

export const dynamic = "force-dynamic";

export default async function EstoqueDashboardPage() {
  const supabaseOk = isSupabaseConfigured();

  const [dashboard, alertas, movimentacoes] = supabaseOk
    ? await Promise.all([
        obterDashboardEstoque(),
        listarAlertasValidade(),
        listarMovimentacoes(10),
      ])
    : [
        {
          total_produtos: 0,
          estoque_baixo: 0,
          produtos_refrigerados: 0,
          alertas_validade: 0,
        },
        [],
        [],
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Estoque</h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral do estoque, alertas de validade e movimentações recentes.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Configure as variáveis do Supabase para visualizar os dados do estoque.
          </p>
        </div>
      )}

      <DashboardCards dados={dashboard} />
      <AlertasValidade alertas={alertas} />
      <MovimentacoesTable movimentacoes={movimentacoes} />
    </div>
  );
}
