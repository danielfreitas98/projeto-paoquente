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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { PlanoContaResumo } from "@/types/financeiro";

interface PlanoContasTableProps {
  itens: PlanoContaResumo[];
  periodo: string;
}

export function PlanoContasTable({ itens, periodo }: PlanoContasTableProps) {
  const receitas = itens.filter((i) => i.tipo === "RECEITA");
  const despesas = itens.filter((i) => i.tipo === "DESPESA");
  const totalReceitas = receitas.reduce((acc, i) => acc + i.total, 0);
  const totalDespesas = despesas.reduce((acc, i) => acc + i.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório Gerencial — Plano de Contas</CardTitle>
        <CardDescription>
          Resumo por categoria — {periodo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento registrado neste período.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ResumoTipo
                titulo="Receitas"
                total={totalReceitas}
                itens={receitas}
                cor="text-success"
              />
              <ResumoTipo
                titulo="Despesas"
                total={totalDespesas}
                itens={despesas}
                cor="text-destructive"
              />
            </div>

            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.categoria_id}>
                      <TableCell className="font-medium">
                        {item.categoria_nome}
                        {item.categoria_pai && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.categoria_pai})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            item.tipo === "RECEITA"
                              ? "border-success/30 text-success"
                              : "border-destructive/30 text-destructive"
                          )}
                        >
                          {item.tipo === "RECEITA" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-semibold",
                          item.tipo === "RECEITA" ? "text-success" : "text-destructive"
                        )}
                      >
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={2} className="font-bold">
                      Resultado do período
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-lg font-bold tabular-nums",
                        totalReceitas - totalDespesas >= 0
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {formatCurrency(totalReceitas - totalDespesas)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ResumoTipo({
  titulo,
  total,
  itens,
  cor,
}: {
  titulo: string;
  total: number;
  itens: PlanoContaResumo[];
  cor: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className={cn("text-xl font-bold tabular-nums", cor)}>
        {formatCurrency(total)}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {itens.slice(0, 3).map((i) => (
          <li key={i.categoria_id} className="flex justify-between">
            <span>{i.categoria_nome}</span>
            <span className="tabular-nums">{formatCurrency(i.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
