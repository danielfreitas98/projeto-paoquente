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
import type { TransacaoFinanceira } from "@/types/financeiro";

interface TransacoesTableProps {
  transacoes: TransacaoFinanceira[];
}

function formatData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function TransacoesTable({ transacoes }: TransacoesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos Recentes</CardTitle>
        <CardDescription>Últimas movimentações financeiras</CardDescription>
      </CardHeader>
      <CardContent>
        {transacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento encontrado. Use os botões acima para registrar receitas ou despesas.
          </p>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatData(t.data_competencia)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {t.descricao}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.categoria_nome ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.conta_nome}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          t.status === "PAGO"
                            ? "border-success/30 text-success"
                            : "border-warning/30 text-warning"
                        )}
                      >
                        {t.status === "PAGO" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        t.tipo === "RECEITA" ? "text-success" : "text-destructive"
                      )}
                    >
                      {t.tipo === "RECEITA" ? "+" : "−"}{" "}
                      {formatCurrency(t.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
