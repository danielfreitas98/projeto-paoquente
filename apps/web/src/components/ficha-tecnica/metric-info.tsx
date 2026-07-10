"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricInfoProps {
  text: string;
  className?: string;
}

export function MetricInfo({ text, className }: MetricInfoProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <Info
        className="size-3.5 cursor-help text-muted-foreground/70 transition-colors hover:text-muted-foreground"
        aria-label={text}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
      </span>
    </span>
  );
}
