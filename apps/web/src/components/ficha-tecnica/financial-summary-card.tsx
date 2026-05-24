"use client";

import { TrendingDown, TrendingUp, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ResumoFinanceiro, TermometroStatus } from "@/lib/ficha-tecnica/calculations";
import { ProfitThermometer } from "./profit-thermometer";

interface FinancialSummaryCardProps {
  resumo: ResumoFinanceiro;
  precoVenda: number;
  margemDesejada: number;
}

const termometroLabels: Record<TermometroStatus, string> = {
  VERDE: "Margem saudável",
  AMARELO: "Abaixo da meta",
  VERMELHO: "Prejuízo",
};

const termometroVariants: Record<
  TermometroStatus,
  "success" | "warning" | "destructive"
> = {
  VERDE: "success",
  AMARELO: "warning",
  VERMELHO: "destructive",
};

export function FinancialSummaryCard({
  resumo,
  precoVenda,
  margemDesejada,
}: FinancialSummaryCardProps) {
  const diferencaSugerido = precoVenda - resumo.precoSugerido;

  return (
    <Card className="sticky top-6 overflow-hidden border-primary/20 shadow-md">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/30 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Thermometer className="size-5 text-primary" />
              Resumo Financeiro
            </CardTitle>
            <CardDescription>Atualizado em tempo real</CardDescription>
          </div>
          <Badge variant={termometroVariants[resumo.termometro]}>
            {termometroLabels[resumo.termometro]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            CMV — Custo de Matéria-Prima
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {formatCurrency(resumo.cmv)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soma dos insumos utilizados na receita
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Preço de Venda Atual</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrency(precoVenda)}
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Preço Sugerido (Markup)</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
              {formatCurrency(resumo.precoSugerido)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {diferencaSugerido >= 0 ? (
            <TrendingUp className="size-4 text-success" />
          ) : (
            <TrendingDown className="size-4 text-destructive" />
          )}
          <span className="text-muted-foreground">
            {diferencaSugerido >= 0 ? "Acima" : "Abaixo"} do sugerido em{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(Math.abs(diferencaSugerido))}
            </span>
          </span>
        </div>

        <Separator />

        <ProfitThermometer
          margemReal={resumo.margemReal}
          margemDesejada={margemDesejada}
          status={resumo.termometro}
          lucroUnitario={resumo.lucroUnitario}
        />
      </CardContent>
    </Card>
  );
}
