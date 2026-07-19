"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatPercent } from "@/lib/utils";
import { calcularCMVPercentual } from "@/lib/ficha-tecnica/calculations";
import type { ProdutoTermometroRow } from "@/types/database";
import { excluirProdutoAction } from "@/app/produtos/actions";

interface ProdutosListProps {
  produtos: ProdutoTermometroRow[];
}

const cmvStatusVariant = {
  VERDE: "success",
  AMARELO: "warning",
  VERMELHO: "destructive",
} as const;

const cmvStatusLabel = {
  VERDE: "Excelente",
  AMARELO: "Atenção",
  VERMELHO: "Crítico",
} as const;

export function ProdutosList({ produtos }: ProdutosListProps) {
  const router = useRouter();

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir o produto "${nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const result = await excluirProdutoAction(id);
    if (!result.success) {
      alert(result.error ?? "Erro ao excluir produto.");
      return;
    }

    router.refresh();
  }

  if (produtos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum produto cadastrado</CardTitle>
          <CardDescription>
            Comece criando sua primeira ficha técnica para calcular CMV e margem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/produtos/novo">
              <Plus className="size-4" />
              Novo Produto
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            {produtos.length} produto{produtos.length !== 1 ? "s" : ""} cadastrado
            {produtos.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Button asChild>
          <Link href="/produtos/novo">
            <Plus className="size-4" />
            Novo Produto
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">CMV %</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead className="text-center">CMV</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.produto_id}>
                  <TableCell className="font-medium">
                    {produto.produto_nome}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={produto.ativo === false ? "secondary" : "success"}>
                      {produto.ativo === false ? "Desativado" : "Ativado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(produto.cmv))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPercent(
                      calcularCMVPercentual(
                        Number(produto.preco_venda),
                        Number(produto.cmv)
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(produto.preco_venda))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-primary">
                    {formatCurrency(Number(produto.preco_sugerido))}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cmvStatusVariant[produto.termometro]}>
                      {cmvStatusLabel[produto.termometro]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link
                          href={`/produtos/${produto.produto_id}/ficha-tecnica`}
                          aria-label={`Editar ${produto.produto_nome}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          handleExcluir(produto.produto_id, produto.produto_nome)
                        }
                        aria-label={`Excluir ${produto.produto_nome}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
