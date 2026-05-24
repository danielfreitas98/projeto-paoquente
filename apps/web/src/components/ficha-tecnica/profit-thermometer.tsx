"use client";

import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { TermometroStatus } from "@/lib/ficha-tecnica/calculations";

interface ProfitThermometerProps {
  margemReal: number;
  margemDesejada: number;
  status: TermometroStatus;
  lucroUnitario: number;
}

const statusConfig: Record<
  TermometroStatus,
  { bar: string; label: string; text: string }
> = {
  VERDE: {
    bar: "bg-success",
    label: "Lucro acima da meta",
    text: "text-success",
  },
  AMARELO: {
    bar: "bg-warning",
    label: "Margem abaixo do desejado",
    text: "text-warning",
  },
  VERMELHO: {
    bar: "bg-destructive",
    label: "Preço abaixo do custo",
    text: "text-destructive",
  },
};

export function ProfitThermometer({
  margemReal,
  margemDesejada,
  status,
  lucroUnitario,
}: ProfitThermometerProps) {
  const config = statusConfig[status];
  const progressValue = Math.min(Math.max(margemReal, 0), 100);
  const metaPosition = Math.min(Math.max(margemDesejada, 0), 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Termômetro de Lucro</p>
        <p className={cn("text-sm font-semibold tabular-nums", config.text)}>
          {formatPercent(margemReal)}
        </p>
      </div>

      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all duration-500", config.bar)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <div
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 bg-foreground/60"
          style={{ left: `${metaPosition}%` }}
          title={`Meta: ${formatPercent(margemDesejada)}`}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>Meta: {formatPercent(margemDesejada)}</span>
        <span>100%</span>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className={cn("text-sm font-medium", config.text)}>{config.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Lucro unitário estimado:{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              lucroUnitario >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatCurrency(lucroUnitario)}
          </span>
        </p>
      </div>
    </div>
  );
}
