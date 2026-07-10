"use client";

import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { CmvStatus } from "@/lib/ficha-tecnica/calculations";
import { MetricInfo } from "./metric-info";

interface CmvIndicatorProps {
  cmvPercentual: number;
  cmvAlvo: number;
  status: CmvStatus;
  margemBruta: number;
}

const statusConfig: Record<
  CmvStatus,
  { bar: string; label: string; text: string; badge: string }
> = {
  VERDE: {
    bar: "bg-success",
    label: "Excelente — CMV abaixo da meta",
    text: "text-success",
    badge: "bg-success/15 text-success",
  },
  AMARELO: {
    bar: "bg-warning",
    label: "Atenção — CMV próximo da meta",
    text: "text-warning",
    badge: "bg-warning/15 text-warning",
  },
  VERMELHO: {
    bar: "bg-destructive",
    label: "Crítico — CMV acima da meta",
    text: "text-destructive",
    badge: "bg-destructive/15 text-destructive",
  },
};

export function CmvIndicator({
  cmvPercentual,
  cmvAlvo,
  status,
  margemBruta,
}: CmvIndicatorProps) {
  const config = statusConfig[status];
  const progressValue = Math.min(Math.max(cmvPercentual, 0), 100);
  const metaPosition = Math.min(Math.max(cmvAlvo, 0), 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium">Indicador de CMV</p>
          <MetricInfo text="CMV % = (Custo da Receita ÷ Preço de Venda) × 100. Quanto menor, melhor a rentabilidade." />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            config.badge
          )}
        >
          {formatPercent(cmvPercentual)}
        </span>
      </div>

      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              config.bar
            )}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <div
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-foreground/70"
          style={{ left: `${metaPosition}%` }}
          title={`Meta CMV: ${formatPercent(cmvAlvo)}`}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>Meta: {formatPercent(cmvAlvo)}</span>
        <span>100%</span>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className={cn("text-sm font-medium", config.text)}>{config.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Margem Bruta (Preço − CMV):{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              margemBruta >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatCurrency(margemBruta)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          Não inclui impostos, embalagem, mão de obra, energia, gás, taxas de
          cartão e demais custos indiretos.
        </p>
      </div>
    </div>
  );
}
