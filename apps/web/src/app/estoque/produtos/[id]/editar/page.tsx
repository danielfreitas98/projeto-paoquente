import { notFound } from "next/navigation";
import { ProdutoForm } from "@/components/estoque/produto-form";
import { obterProdutoEstoque } from "@/lib/supabase/queries/estoque";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProdutoEstoquePage({ params }: PageProps) {
  const { id } = await params;
  const produto = await obterProdutoEstoque(id);

  if (!produto) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Produto</h1>
        <p className="mt-1 text-muted-foreground">{produto.descricao}</p>
      </div>
      <ProdutoForm produto={produto} />
    </div>
  );
}
