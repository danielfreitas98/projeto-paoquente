"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  produtoEstoqueSchema,
  CATEGORIA_LABELS,
  UNIDADE_LABELS,
  type ProdutoEstoqueFormData,
} from "@/lib/estoque/schemas";
import {
  criarProdutoEstoqueAction,
  atualizarProdutoEstoqueAction,
} from "@/app/estoque/actions";
import type { ProdutoEstoque } from "@/types/estoque";

interface ProdutoFormProps {
  produto?: ProdutoEstoque;
}

export function ProdutoForm({ produto }: ProdutoFormProps) {
  const router = useRouter();
  const isEdicao = Boolean(produto);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoEstoqueFormData>({
    resolver: zodResolver(produtoEstoqueSchema),
    defaultValues: produto
      ? {
          codigo: produto.codigo,
          descricao: produto.descricao,
          categoria: produto.categoria,
          unidade_medida: produto.unidade_medida,
          estoque_minimo: produto.estoque_minimo,
          custo_medio: produto.custo_medio,
        }
      : {
          categoria: "INSUMO",
          unidade_medida: "un",
          estoque_minimo: 0,
          custo_medio: 0,
        },
  });

  const categoria = watch("categoria");
  const unidade = watch("unidade_medida");

  async function onSubmit(data: ProdutoEstoqueFormData) {
    const result = isEdicao
      ? await atualizarProdutoEstoqueAction(produto!.id, data)
      : await criarProdutoEstoqueAction(data);

    if (!result.success) {
      alert(result.error);
      return;
    }

    router.push("/estoque/produtos");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdicao ? "Editar Produto" : "Novo Produto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" {...register("codigo")} placeholder="Ex: INS-001" />
              {errors.codigo && (
                <p className="text-sm text-destructive">{errors.codigo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" {...register("descricao")} placeholder="Nome do produto" />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) =>
                  setValue("categoria", v as ProdutoEstoqueFormData["categoria"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unidade de Medida</Label>
              <Select
                value={unidade}
                onValueChange={(v) =>
                  setValue("unidade_medida", v as ProdutoEstoqueFormData["unidade_medida"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIDADE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                step="0.01"
                min="0"
                {...register("estoque_minimo", { valueAsNumber: true })}
              />
              {errors.estoque_minimo && (
                <p className="text-sm text-destructive">{errors.estoque_minimo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo_medio">Custo Médio (R$)</Label>
              <Input
                id="custo_medio"
                type="number"
                step="0.01"
                min="0"
                {...register("custo_medio", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEdicao ? "Salvar alterações" : "Cadastrar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
