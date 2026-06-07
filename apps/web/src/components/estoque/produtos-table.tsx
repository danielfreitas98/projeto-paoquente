"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIA_LABELS } from "@/lib/estoque/schemas";
import { excluirProdutoEstoqueAction } from "@/app/estoque/actions";
import type { ProdutoEstoque } from "@/types/estoque";

interface ProdutosTableProps {
  produtos: ProdutoEstoque[];
  podeEditar: boolean;
}

function categoriaBadge(categoria: ProdutoEstoque["categoria"]) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    INSUMO: "secondary",
    ACABADO: "default",
    REFRIGERADO: "outline",
  };
  return (
    <Badge variant={variants[categoria] ?? "default"}>
      {CATEGORIA_LABELS[categoria]}
    </Badge>
  );
}

export function ProdutosTable({ produtos, podeEditar }: ProdutosTableProps) {
  const router = useRouter();

  async function handleExcluir(id: string, descricao: string) {
    if (!confirm(`Desativar o produto "${descricao}"?`)) return;
    const result = await excluirProdutoEstoqueAction(id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  if (produtos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          {podeEditar && (
            <Button asChild className="mt-4">
              <Link href="/estoque/produtos/novo">Cadastrar produto</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Custo Médio</TableHead>
              {podeEditar && <TableHead className="w-24">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => {
              const estoqueBaixo =
                produto.estoque_minimo > 0 &&
                produto.estoque_atual <= produto.estoque_minimo;
              return (
                <TableRow key={produto.id}>
                  <TableCell className="font-mono text-sm">{produto.codigo}</TableCell>
                  <TableCell className="font-medium">{produto.descricao}</TableCell>
                  <TableCell>{categoriaBadge(produto.categoria)}</TableCell>
                  <TableCell>
                    <span className={estoqueBaixo ? "font-semibold text-destructive" : ""}>
                      {produto.estoque_atual} {produto.unidade_medida}
                    </span>
                    {estoqueBaixo && (
                      <Badge variant="warning" className="ml-2">
                        Baixo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {produto.estoque_minimo} {produto.unidade_medida}
                  </TableCell>
                  <TableCell>{formatCurrency(produto.custo_medio)}</TableCell>
                  {podeEditar && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/estoque/produtos/${produto.id}/editar`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluir(produto.id, produto.descricao)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
