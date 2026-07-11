"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lancamentoSchema, type LancamentoFormData } from "@/lib/financeiro/schemas";
import { registrarLancamentoAction } from "@/app/financeiro/actions";
import type { CategoriaFinanceira, ContaBancaria } from "@/types/financeiro";

interface LancamentoDialogProps {
  categorias: CategoriaFinanceira[];
  contas: ContaBancaria[];
  supabaseOk: boolean;
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function LancamentoDialog({
  categorias,
  contas,
  supabaseOk,
}: LancamentoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<"RECEITA" | "DESPESA">("RECEITA");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LancamentoFormData>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      tipo: "RECEITA",
      data_competencia: todayLocal(),
      valor: 0,
    },
  });

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoLancamento);
  const contaId = watch("conta_id");
  const categoriaId = watch("categoria_id");

  function abrirDialog(tipo: "RECEITA" | "DESPESA") {
    setTipoLancamento(tipo);
    const contaPadrao = contas[0]?.id;
    reset({
      tipo,
      descricao: "",
      valor: 0,
      categoria_id: undefined,
      conta_id: contaPadrao,
      data_competencia: todayLocal(),
      metodo_pagamento: undefined,
    });
    if (contaPadrao) setValue("conta_id", contaPadrao);
    setValue("tipo", tipo);
    setOpen(true);
  }

  async function onSubmit(data: LancamentoFormData) {
    const result = await registrarLancamentoAction({ ...data, tipo: tipoLancamento });
    if (!result.success) {
      alert(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => abrirDialog("RECEITA")}
          disabled={!supabaseOk}
          className="bg-success hover:bg-success/90"
        >
          <ArrowUpCircle className="mr-2 size-4" />
          Nova Receita
        </Button>
        <Button
          onClick={() => abrirDialog("DESPESA")}
          disabled={!supabaseOk}
          variant="destructive"
        >
          <ArrowDownCircle className="mr-2 size-4" />
          Nova Despesa
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" key={tipoLancamento}>
          <DialogHeader>
            <DialogTitle>
              {tipoLancamento === "RECEITA" ? "Lançar Receita" : "Lançar Despesa"}
            </DialogTitle>
            <DialogDescription>
              Registre um lançamento manual no livro caixa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder={
                  tipoLancamento === "RECEITA"
                    ? "Ex: Venda balcão — tarde"
                    : "Ex: Compra de insumos"
                }
                {...register("descricao")}
              />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register("valor", { valueAsNumber: true })}
                />
                {errors.valor && (
                  <p className="text-sm text-destructive">{errors.valor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_competencia">Data</Label>
                <Input
                  id="data_competencia"
                  type="date"
                  {...register("data_competencia")}
                />
                {errors.data_competencia && (
                  <p className="text-sm text-destructive">
                    {errors.data_competencia.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoriaId ?? ""} onValueChange={(v) => setValue("categoria_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria_id && (
                <p className="text-sm text-destructive">{errors.categoria_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={contaId ?? ""} onValueChange={(v) => setValue("conta_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.conta_id && (
                <p className="text-sm text-destructive">{errors.conta_id.message}</p>
              )}
            </div>

            {tipoLancamento === "RECEITA" && (
              <div className="space-y-2">
                <Label>Método de pagamento (opcional)</Label>
                <Select onValueChange={(v) => setValue("metodo_pagamento", v as LancamentoFormData["metodo_pagamento"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não informado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="DEBITO">Débito</SelectItem>
                    <SelectItem value="CREDITO">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
