import { AlertCircle } from "lucide-react";
import { ImportarXmlForm } from "@/components/estoque/importar-xml-form";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/supabase/admin";
import { listarProdutosEstoque } from "@/lib/supabase/queries/estoque";

export const dynamic = "force-dynamic";

export default async function ImportarXmlPage() {
  const supabaseOk = isSupabaseConfigured();
  const podeImportar = hasServiceRoleKey();

  const produtos = supabaseOk ? await listarProdutosEstoque() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Nota Fiscal XML</h1>
        <p className="mt-1 text-muted-foreground">
          Faça upload do XML da NF-e para entrada automática no estoque.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">Supabase não configurado.</p>
        </div>
      )}

      {supabaseOk && !podeImportar && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Adicione <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> para importar NF-e.
          </p>
        </div>
      )}

      {podeImportar && <ImportarXmlForm produtos={produtos} />}
    </div>
  );
}
