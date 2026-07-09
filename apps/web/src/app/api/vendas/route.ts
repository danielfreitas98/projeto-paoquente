import { NextResponse } from "next/server";
import { registrarVendaSchema } from "@/lib/pdv/schemas";
import { registrarVenda } from "@/lib/supabase/queries/vendas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registrarVendaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? "Dados inválidos",
        },
        { status: 400 }
      );
    }

    const result = await registrarVenda(parsed.data);

    if (!result.success) {
      const status = result.error.includes("insuficiente") ? 409 : 500;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao processar a requisição." },
      { status: 500 }
    );
  }
}
