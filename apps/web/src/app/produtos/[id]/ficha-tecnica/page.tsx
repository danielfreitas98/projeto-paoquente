import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FichaTecnicaForm } from "@/components/ficha-tecnica/ficha-tecnica-form";
import { obterFichaTecnicaPorProduto } from "@/lib/supabase/queries/produtos";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await obterFichaTecnicaPorProduto(id);
  return {
    title: data
      ? `${data.nomeProduto} — Ficha Técnica`
      : "Ficha Técnica — SWM - CRM",
  };
}

export default async function EditarFichaTecnicaPage({ params }: PageProps) {
  const { id } = await params;
  const initialData = await obterFichaTecnicaPorProduto(id);

  if (!initialData) {
    notFound();
  }

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
        <h1 className="text-2xl font-bold tracking-tight">
          {initialData.nomeProduto}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Edite a ficha técnica e acompanhe o impacto no CMV e margem de lucro.
        </p>
      </div>

      <FichaTecnicaForm initialData={initialData} />
    </div>
  );
}
