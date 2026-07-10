import { NextResponse } from "next/server";
import { listarTodosProdutosPdv } from "@/lib/supabase/queries/vendas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const produtos = await listarTodosProdutosPdv();
    const cardapio = produtos.filter((p) => p.origem === "produto");
    const estoque = produtos.filter((p) => p.origem === "estoque");

    return NextResponse.json({
      success: true,
      data: produtos,
      meta: {
        total: produtos.length,
        cardapio: cardapio.length,
        estoque: estoque.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar produtos do PDV.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
