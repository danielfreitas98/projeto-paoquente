"use client";

import { TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  cn,
  formatCurrency,
  formatMultiplier,
  formatPercent,
} from "@/lib/utils";
import type { CmvStatus, ResumoFinanceiro } from "@/lib/ficha-tecnica/calculations";
import { CmvIndicator } from "./cmv-indicator";
import { FinancialMetric } from "./financial-metric";

interface FinancialSummaryCardProps {
  resumo: ResumoFinanceiro;
  cmvAlvo: number;
}

const statusLabels: Record<CmvStatus, string> = {
  VERDE: "Excelente",
  AMARELO: "Atenção",
  VERMELHO: "Crítico",
};

const statusVariants: Record<
  CmvStatus,
  "success" | "warning" | "destructive"
> = {
  VERDE: "success",
  AMARELO: "warning",
  VERMELHO: "destructive",
};

export function FinancialSummaryCard({
  resumo,
  cmvAlvo,
}: FinancialSummaryCardProps) {
  const acimaDoSugerido = resumo.diferencaPreco >= 0;

  return (
    <Card className="sticky top-6 overflow-hidden border-primary/20 shadow-md">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/30 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="size-5 text-primary" />
              Resumo Financeiro
            </CardTitle>
            <CardDescription>Atualizado em tempo real</CardDescription>
          </div>
          <Badge variant={statusVariants[resumo.statusCmv]}>
            {statusLabels[resumo.statusCmv]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custo da Receita (CMV)
            </p>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {formatCurrency(resumo.cmv)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soma dos insumos utilizados na receita
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FinancialMetric
            label="CMV (R$)"
            value={formatCurrency(resumo.cmv)}
            tooltip="Custo de Matéria-Prima: soma dos insumos da ficha técnica."
          />
          <FinancialMetric
            label="CMV %"
            value={formatPercent(resumo.cmvPercentual)}
            tooltip="Percentual do custo em relação ao preço de venda atual."
            variant={
              resumo.statusCmv === "VERDE"
                ? "success"
                : resumo.statusCmv === "AMARELO"
                  ? "warning"
                  : "destructive"
            }
          />
          <FinancialMetric
            label="Preço Atual"
            value={formatCurrency(resumo.precoAtual)}
            tooltip="Preço de venda cadastrado para o produto."
          />
          <FinancialMetric
            label="Preço Sugerido (CMV Alvo)"
            value={formatCurrency(resumo.precoSugerido)}
            tooltip={`Calculado como: Custo da Receita ÷ (CMV Alvo ÷ 100). Meta: ${formatPercent(cmvAlvo)}.`}
            highlight
            variant="primary"
          />
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
            acimaDoSugerido
              ? "border-success/30 bg-success/5"
              : "border-destructive/30 bg-destructive/5"
          )}
        >
          {acimaDoSugerido ? (
            <TrendingUp className="size-4 shrink-0 text-success" />
          ) : (
            <TrendingDown className="size-4 shrink-0 text-destructive" />
          )}
          <span className="text-muted-foreground">
            Diferença:{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                acimaDoSugerido ? "text-success" : "text-destructive"
              )}
            >
              {acimaDoSugerido ? "+" : "−"}
              {formatCurrency(Math.abs(resumo.diferencaPreco))}
            </span>
            <span className="ml-1">
              ({acimaDoSugerido ? "acima" : "abaixo"} do sugerido)
            </span>
          </span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <FinancialMetric
            label="Margem Bruta"
            value={formatCurrency(resumo.margemBruta)}
            tooltip="Preço de venda menos o CMV. Não considera custos indiretos."
            variant={resumo.margemBruta >= 0 ? "success" : "destructive"}
          />
          <FinancialMetric
            label="Margem Bruta %"
            value={formatPercent(resumo.margemBrutaPercentual)}
            tooltip="(Preço − CMV) ÷ Preço × 100."
            variant={resumo.margemBrutaPercentual >= 0 ? "success" : "destructive"}
          />
          <FinancialMetric
            label="Markup"
            value={formatMultiplier(resumo.markup)}
            tooltip="Multiplicador do preço sobre o CMV: Preço ÷ CMV."
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <Separator />

        <CmvIndicator
          cmvPercentual={resumo.cmvPercentual}
          cmvAlvo={cmvAlvo}
          status={resumo.statusCmv}
          margemBruta={resumo.margemBruta}
        />
      </CardContent>
    </Card>
  );
}
