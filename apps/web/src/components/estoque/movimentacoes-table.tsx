import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { TIPO_MOVIMENTACAO_LABELS } from "@/lib/estoque/schemas";
import type { MovimentacaoComProduto } from "@/types/estoque";

interface MovimentacoesTableProps {
  movimentacoes: MovimentacaoComProduto[];
  titulo?: string;
}

function tipoBadge(tipo: MovimentacaoComProduto["tipo"]) {
  switch (tipo) {
    case "ENTRADA":
      return <Badge variant="success">{TIPO_MOVIMENTACAO_LABELS[tipo]}</Badge>;
    case "SAIDA":
      return <Badge variant="destructive">{TIPO_MOVIMENTACAO_LABELS[tipo]}</Badge>;
    default:
      return <Badge variant="warning">{TIPO_MOVIMENTACAO_LABELS[tipo]}</Badge>;
  }
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MovimentacoesTable({
  movimentacoes,
  titulo = "Últimas Movimentações",
}: MovimentacoesTableProps) {
  if (movimentacoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Custo Unit.</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimentacoes.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDateTime(mov.created_at)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{mov.produto_descricao}</p>
                    <p className="text-xs text-muted-foreground">{mov.produto_codigo}</p>
                  </div>
                </TableCell>
                <TableCell>{tipoBadge(mov.tipo)}</TableCell>
                <TableCell>
                  {mov.quantidade} {mov.produto_unidade}
                </TableCell>
                <TableCell>
                  {mov.custo_unitario > 0 ? formatCurrency(mov.custo_unitario) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {mov.usuario || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
