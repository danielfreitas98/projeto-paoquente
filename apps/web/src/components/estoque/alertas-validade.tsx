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
import type { LoteValidadeAlerta } from "@/types/estoque";

interface AlertasValidadeProps {
  alertas: LoteValidadeAlerta[];
}

function statusBadge(status: LoteValidadeAlerta["status_validade"]) {
  switch (status) {
    case "VENCIDO":
      return <Badge variant="destructive">Vencido</Badge>;
    case "CRITICO":
      return <Badge variant="destructive">Crítico</Badge>;
    case "ATENCAO":
      return <Badge variant="warning">Atenção</Badge>;
    default:
      return <Badge variant="success">OK</Badge>;
  }
}

function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}

export function AlertasValidade({ alertas }: AlertasValidadeProps) {
  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas de Validade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum lote com validade próxima nos próximos 7 dias.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas de Validade</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertas.map((alerta) => (
              <TableRow key={alerta.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{alerta.produto_descricao}</p>
                    <p className="text-xs text-muted-foreground">{alerta.produto_codigo}</p>
                  </div>
                </TableCell>
                <TableCell>{alerta.lote}</TableCell>
                <TableCell>{alerta.quantidade}</TableCell>
                <TableCell>{formatDate(alerta.data_validade)}</TableCell>
                <TableCell>{statusBadge(alerta.status_validade)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
