import type { UnidadeMedida } from "@/lib/ficha-tecnica/calculations";
import type { Insumo } from "@/lib/ficha-tecnica/calculations";
import type { UnidadeMedidaEstoque } from "@/types/estoque";

export function estoqueUnidadeParaFicha(
  unidade: UnidadeMedidaEstoque
): UnidadeMedida {
  if (unidade === "kg") return "g";
  if (unidade === "l") return "ml";
  if (unidade === "g" || unidade === "ml" || unidade === "un") return unidade;
  return "un";
}

export function estoqueCustoUnitarioFicha(
  unidade: UnidadeMedidaEstoque,
  custoMedio: number
): number {
  if (unidade === "kg" || unidade === "l") return custoMedio / 1000;
  return custoMedio;
}

export function mapEstoqueProdutoParaInsumo(row: {
  id: string;
  descricao: string;
  unidade_medida: UnidadeMedidaEstoque;
  custo_medio: number;
}): Insumo {
  return {
    id: row.id,
    nome: row.descricao,
    unidadeMedida: estoqueUnidadeParaFicha(row.unidade_medida),
    custoUnitario: estoqueCustoUnitarioFicha(
      row.unidade_medida,
      Number(row.custo_medio)
    ),
  };
}
