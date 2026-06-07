import { AlertCircle } from "lucide-react";
import { MovimentacaoForm } from "@/components/estoque/movimentacao-form";
import { MovimentacoesTable } from "@/components/estoque/movimentacoes-table";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  listarProdutosEstoque,
  listarMovimentacoes,
} from "@/lib/supabase/queries/estoque";

export const dynamic = "force-dynamic";

export default async function MovimentacoesPage() {
  const supabaseOk = isSupabaseConfigured();
  const podeEditar = hasServiceRoleKey();

  const [produtos, movimentacoes] = supabaseOk
    ? await Promise.all([listarProdutosEstoque(), listarMovimentacoes(50)])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movimentações</h1>
        <p className="mt-1 text-muted-foreground">
          Registre entradas, saídas e ajustes de inventário.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">Supabase não configurado.</p>
        </div>
      )}

      {podeEditar && produtos.length > 0 && <MovimentacaoForm produtos={produtos} />}

      {podeEditar && produtos.length === 0 && supabaseOk && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Cadastre produtos antes de registrar movimentações.
        </div>
      )}

      <MovimentacoesTable movimentacoes={movimentacoes} titulo="Histórico de Movimentações" />
    </div>
  );
}
