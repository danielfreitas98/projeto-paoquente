import { ProdutoForm } from "@/components/estoque/produto-form";

export default function NovoProdutoEstoquePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Produto</h1>
        <p className="mt-1 text-muted-foreground">
          Cadastre um novo item no estoque.
        </p>
      </div>
      <ProdutoForm />
    </div>
  );
}
