"use client";

import { cn } from "@/lib/utils";
import { MetricInfo } from "./metric-info";

interface FinancialMetricProps {
  label: string;
  value: string;
  tooltip?: string;
  highlight?: boolean;
  variant?: "default" | "success" | "warning" | "destructive" | "primary";
  className?: string;
}

const variantStyles = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
};

export function FinancialMetric({
  label,
  value,
  tooltip,
  highlight = false,
  variant = "default",
  className,
}: FinancialMetricProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3 transition-colors",
        highlight && "border-primary/30 bg-primary/5",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {tooltip && <MetricInfo text={tooltip} />}
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          variantStyles[variant]
        )}
      >
        {value}
      </p>
    </div>
  );
}
