import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ProdutosList } from "@/components/ficha-tecnica/produtos-list";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { listarProdutosComTermometro } from "@/lib/supabase/queries/produtos";

export const metadata = {
  title: "Produtos — Pão Quente",
  description: "Lista de produtos e fichas técnicas",
};

export default async function ProdutosPage() {
  const produtos = await listarProdutosComTermometro();
  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="mt-1 text-muted-foreground">
          Gerencie fichas técnicas, CMV e margens de lucro dos seus produtos.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Supabase não configurado</p>
            <p className="text-muted-foreground">
              Configure{" "}
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
              <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e{" "}
              <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> em{" "}
              <code className="text-xs">apps/web/.env.local</code>.
            </p>
          </div>
        </div>
      )}

      <ProdutosList produtos={produtos} />

      {produtos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/produtos/novo" className="text-primary hover:underline">
            + Cadastrar novo produto
          </Link>
        </p>
      )}
    </div>
  );
}
