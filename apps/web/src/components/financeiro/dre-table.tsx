"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import type { DreLinha } from "@/lib/financeiro/mock-data";

interface DreTableProps {
  linhas: DreLinha[];
  periodo: string;
}

export function DreTable({ linhas, periodo }: DreTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE Simplificado</CardTitle>
        <CardDescription>Demonstração do Resultado — {periodo}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableBody>
              {linhas.map((linha) => (
                <TableRow
                  key={linha.id}
                  className={cn(
                    linha.destaque && "bg-primary/5 hover:bg-primary/5"
                  )}
                >
                  <TableCell
                    className={cn(
                      "font-medium",
                      linha.destaque && "text-base font-bold text-primary"
                    )}
                  >
                    {linha.descricao}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-semibold",
                      linha.tipo === "receita" && linha.valor > 0 && !linha.destaque && "text-success",
                      (linha.tipo === "custo" || linha.tipo === "despesa") && "text-destructive",
                      linha.destaque && "text-lg text-primary"
                    )}
                  >
                    {linha.tipo === "custo" || linha.tipo === "despesa"
                      ? `− ${formatCurrency(Math.abs(linha.valor))}`
                      : formatCurrency(linha.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
