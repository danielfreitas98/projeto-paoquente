import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProdutosTable } from "@/components/estoque/produtos-table";
import { ProdutosFiltros } from "@/components/estoque/produtos-filtros";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/supabase/admin";
import { listarProdutosEstoque } from "@/lib/supabase/queries/estoque";
import type { CategoriaEstoque } from "@/types/estoque";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ busca?: string; categoria?: string }>;
}

export default async function ProdutosEstoquePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabaseOk = isSupabaseConfigured();
  const podeEditar = hasServiceRoleKey();

  const categoria =
    params.categoria && params.categoria !== "TODAS"
      ? (params.categoria as CategoriaEstoque)
      : undefined;

  const produtos = supabaseOk
    ? await listarProdutosEstoque({
        busca: params.busca,
        categoria: categoria ?? "TODAS",
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos de Estoque</h1>
          <p className="mt-1 text-muted-foreground">
            Cadastro de insumos, produtos acabados e refrigerados.
          </p>
        </div>
        {podeEditar && (
          <Button asChild>
            <Link href="/estoque/produtos/novo">
              <Plus className="size-4" />
              Novo produto
            </Link>
          </Button>
        )}
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">Supabase não configurado.</p>
        </div>
      )}

      {supabaseOk && !podeEditar && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Modo somente leitura. Adicione{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> para editar.
          </p>
        </div>
      )}

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-muted" />}>
        <ProdutosFiltros />
      </Suspense>

      <ProdutosTable produtos={produtos} podeEditar={podeEditar} />
    </div>
  );
}
