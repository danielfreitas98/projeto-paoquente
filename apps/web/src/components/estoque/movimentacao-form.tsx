"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  movimentacaoSchema,
  TIPO_MOVIMENTACAO_LABELS,
  type MovimentacaoFormData,
} from "@/lib/estoque/schemas";
import { registrarMovimentacaoAction } from "@/app/estoque/actions";
import type { ProdutoEstoque, TipoMovimentacaoEstoque } from "@/types/estoque";

interface MovimentacaoFormProps {
  produtos: ProdutoEstoque[];
}

export function MovimentacaoForm({ produtos }: MovimentacaoFormProps) {
  const router = useRouter();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoMovimentacaoEstoque>("ENTRADA");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MovimentacaoFormData>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: {
      tipo: "ENTRADA",
      custo_unitario: 0,
    },
  });

  const produtoId = watch("produto_id");
  const produtoSelecionado = produtos.find((p) => p.id === produtoId);
  const isRefrigerado = produtoSelecionado?.categoria === "REFRIGERADO";
  const isEntrada = tipoSelecionado === "ENTRADA";
  const isAjuste = tipoSelecionado === "AJUSTE";

  async function onSubmit(data: MovimentacaoFormData) {
    const result = await registrarMovimentacaoAction(data);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
    alert("Movimentação registrada com sucesso!");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Movimentação</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipoSelecionado}
                onValueChange={(v) => {
                  const tipo = v as TipoMovimentacaoEstoque;
                  setTipoSelecionado(tipo);
                  setValue("tipo", tipo);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_MOVIMENTACAO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <Select
                value={produtoId ?? ""}
                onValueChange={(v) => setValue("produto_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} — {p.descricao} ({p.estoque_atual} {p.unidade_medida})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.produto_id && (
                <p className="text-sm text-destructive">{errors.produto_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">
                {isAjuste ? "Nova quantidade em estoque" : "Quantidade"}
              </Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0.01"
                {...register("quantidade", { valueAsNumber: true })}
              />
              {errors.quantidade && (
                <p className="text-sm text-destructive">{errors.quantidade.message}</p>
              )}
            </div>

            {isEntrada && (
              <div className="space-y-2">
                <Label htmlFor="custo_unitario">Custo Unitário (R$)</Label>
                <Input
                  id="custo_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("custo_unitario", { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="usuario">Usuário</Label>
              <Input id="usuario" {...register("usuario")} placeholder="Nome do responsável" />
            </div>
          </div>

          {isRefrigerado && isEntrada && (
            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3">
              <p className="col-span-full text-sm font-medium text-muted-foreground">
                Controle de lote (refrigerado)
              </p>
              <div className="space-y-2">
                <Label htmlFor="lote">Lote</Label>
                <Input id="lote" {...register("lote")} placeholder="Ex: L2024-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fabricacao">Data Fabricação</Label>
                <Input id="data_fabricacao" type="date" {...register("data_fabricacao")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_validade">Data Validade</Label>
                <Input id="data_validade" type="date" {...register("data_validade")} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" {...register("observacao")} rows={2} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar movimentação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
