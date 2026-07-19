import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { FichaTecnicaForm } from "@/components/ficha-tecnica/ficha-tecnica-form";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { obterDadosNovoProduto } from "@/lib/supabase/queries/produtos";

export const metadata = {
  title: "Novo Produto — SWM - CRM",
  description: "Cadastrar nova ficha técnica",
};

export default async function NovoProdutoPage() {
  const initialData = await obterDadosNovoProduto();
  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/produtos"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para produtos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo Produto</h1>
        <p className="mt-1 text-muted-foreground">
          Cadastre um produto e monte sua ficha técnica com cálculo de CMV em tempo real.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Sem conexão com Supabase, os dados não serão persistidos ao salvar.
          </p>
        </div>
      )}

      <FichaTecnicaForm initialData={initialData} />
    </div>
  );
}
