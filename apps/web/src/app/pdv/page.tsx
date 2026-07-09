import { PdvScreen } from "@/components/pdv/pdv-screen";
import {
  listarProdutosMaisVendidos,
  listarProdutosPdv,
} from "@/lib/supabase/queries/vendas";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const [produtos, produtosDestaque] = await Promise.all([
    listarProdutosPdv(),
    listarProdutosMaisVendidos(12),
  ]);

  return <PdvScreen produtos={produtos} produtosDestaque={produtosDestaque} />;
}
