import { AlertCircle } from "lucide-react";
import { SummaryCards } from "@/components/financeiro/summary-cards";
import { CashFlowChart } from "@/components/financeiro/cash-flow-chart";
import { DreTable } from "@/components/financeiro/dre-table";
import { obterDashboardFinanceiro } from "@/lib/supabase/queries/financeiro";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata = {
  title: "Financeiro — Pão Quente",
  description: "Fluxo de caixa e DRE simplificado",
};

export default async function FinanceiroPage() {
  const dashboard = await obterDashboardFinanceiro();
  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestão Financeira
        </h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral do fluxo de caixa e demonstrativo de resultados —{" "}
          {dashboard.resumo.periodo}
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Supabase não configurado — exibindo dados de demonstração.
          </p>
        </div>
      )}

      {supabaseOk && dashboard.usandoMock && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Sem transações no banco para este mês — exibindo dados de demonstração.
          </p>
        </div>
      )}

      <SummaryCards resumo={dashboard.resumo} />

      <CashFlowChart data={dashboard.fluxo7Dias} />

      <DreTable linhas={dashboard.dre} periodo={dashboard.resumo.periodo} />
    </div>
  );
}
