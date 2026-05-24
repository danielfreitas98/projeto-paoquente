"use client";

import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ResumoFinanceiroMensal } from "@/lib/financeiro/mock-data";

interface SummaryCardsProps {
  resumo: ResumoFinanceiroMensal;
}

export function SummaryCards({ resumo }: SummaryCardsProps) {
  const cards = [
    {
      title: "Total de Receitas",
      value: resumo.totalReceitas,
      icon: ArrowUpCircle,
      className: "border-success/30 bg-success/5",
      iconClassName: "text-success",
      valueClassName: "text-success",
    },
    {
      title: "Total de Despesas",
      value: resumo.totalDespesas,
      icon: ArrowDownCircle,
      className: "border-destructive/30 bg-destructive/5",
      iconClassName: "text-destructive",
      valueClassName: "text-destructive",
    },
    {
      title: "Saldo em Caixa",
      value: resumo.saldoCaixa,
      icon: Wallet,
      className: "border-slate-300 bg-slate-50",
      iconClassName: "text-slate-600",
      valueClassName: "text-slate-800",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className={card.className}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`size-5 ${card.iconClassName}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums ${card.valueClassName}`}>
              {formatCurrency(card.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
