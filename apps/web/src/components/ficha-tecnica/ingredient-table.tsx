"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { IngredienteFicha } from "@/lib/ficha-tecnica/calculations";
import { formatUnidade } from "@/lib/ficha-tecnica/calculations";

interface IngredientTableProps {
  ingredientes: IngredienteFicha[];
  onRemove: (id: string) => void;
}

export function IngredientTable({ ingredientes, onRemove }: IngredientTableProps) {
  if (ingredientes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum ingrediente adicionado
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Selecione um insumo acima para montar a ficha técnica.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Insumo</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Custo Unit.</TableHead>
            <TableHead className="text-right">Custo Linha</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredientes.map((item) => {
            const custoLinha = item.quantidade * item.custoUnitario;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantidade} {formatUnidade(item.unidadeMedida)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.custoUnitario)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(custoLinha)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remover ${item.nome}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
