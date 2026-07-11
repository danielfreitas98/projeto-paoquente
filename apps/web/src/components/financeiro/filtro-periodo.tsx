"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRESETS_PERIODO,
  periodoPadrao,
  type FiltroPeriodo,
} from "@/lib/financeiro/periodo";

export function FiltroPeriodoFinanceiro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const padrao = periodoPadrao();
  const dataInicio = searchParams.get("de") ?? padrao.dataInicio;
  const dataFim = searchParams.get("ate") ?? padrao.dataFim;

  const aplicarPeriodo = useCallback(
    (periodo: FiltroPeriodo) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("de", periodo.dataInicio);
      params.set("ate", periodo.dataFim);
      startTransition(() => {
        router.push(`/financeiro?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const de = String(form.get("de") ?? "");
    const ate = String(form.get("ate") ?? "");
    if (de && ate) aplicarPeriodo({ dataInicio: de, dataFim: ate });
  }

  function limparFiltros() {
    startTransition(() => {
      router.push("/financeiro");
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Calendar className="size-4 text-muted-foreground" />
        Filtrar por período
      </div>

      <form
        key={`${dataInicio}-${dataFim}`}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 lg:flex-row lg:items-end"
      >
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="de">Data inicial</Label>
            <Input
              id="de"
              name="de"
              type="date"
              defaultValue={dataInicio}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ate">Data final</Label>
            <Input
              id="ate"
              name="ate"
              type="date"
              defaultValue={dataFim}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Filtrando..." : "Aplicar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={limparFiltros}
            disabled={isPending}
          >
            <RotateCcw className="mr-2 size-4" />
            Mês atual
          </Button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS_PERIODO.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => aplicarPeriodo(preset.getValue())}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
