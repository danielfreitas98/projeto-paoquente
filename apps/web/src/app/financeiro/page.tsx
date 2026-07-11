import { Suspense } from "react";
import { AlertCircle } from "lucide-react";
import { SummaryCards } from "@/components/financeiro/summary-cards";
import { CashFlowChart } from "@/components/financeiro/cash-flow-chart";
import { DreTable } from "@/components/financeiro/dre-table";
import { FiltroPeriodoFinanceiro } from "@/components/financeiro/filtro-periodo";
import { LancamentoDialog } from "@/components/financeiro/lancamento-dialog";
import { PlanoContasTable } from "@/components/financeiro/plano-contas-table";
import { TransacoesTable } from "@/components/financeiro/transacoes-table";
import { obterDadosFinanceiroPage } from "@/lib/supabase/queries/financeiro";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata = {
  title: "Financeiro — Pão Quente",
  description: "Fluxo de caixa, DRE e relatórios gerenciais",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ de?: string; ate?: string }>;
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { dashboard, transacoes, planoContas, categorias, contas } =
    await obterDadosFinanceiroPage(params);
  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestão Financeira
          </h1>
          <p className="mt-1 text-muted-foreground">
            Visão geral do fluxo de caixa e demonstrativo de resultados —{" "}
            {dashboard.resumo.periodo}
          </p>
        </div>
        <LancamentoDialog
          categorias={categorias}
          contas={contas}
          supabaseOk={supabaseOk}
        />
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Supabase não configurado — exibindo dados de demonstração. Configure as
            variáveis de ambiente para usar dados reais e registrar lançamentos.
          </p>
        </div>
      )}

      <Suspense fallback={<div className="h-28 animate-pulse rounded-lg bg-muted" />}>
        <FiltroPeriodoFinanceiro />
      </Suspense>

      <SummaryCards
        resumo={dashboard.resumo}
        periodo={dashboard.resumo.periodo}
      />

      <CashFlowChart
        data={dashboard.fluxoPeriodo}
        periodo={dashboard.resumo.periodo}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DreTable linhas={dashboard.dre} periodo={dashboard.resumo.periodo} />
        <PlanoContasTable
          itens={planoContas}
          periodo={dashboard.resumo.periodo}
        />
      </div>

      <TransacoesTable transacoes={transacoes} />
    </div>
  );
}
