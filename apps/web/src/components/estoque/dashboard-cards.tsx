import { Package, AlertTriangle, Snowflake, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EstoqueDashboard } from "@/types/estoque";

interface DashboardCardsProps {
  dados: EstoqueDashboard;
}

const cards = [
  {
    key: "total_produtos" as const,
    label: "Total de Produtos",
    icon: Package,
    variant: "default" as const,
  },
  {
    key: "estoque_baixo" as const,
    label: "Estoque Baixo",
    icon: AlertTriangle,
    variant: "warning" as const,
  },
  {
    key: "produtos_refrigerados" as const,
    label: "Refrigerados",
    icon: Snowflake,
    variant: "default" as const,
  },
  {
    key: "alertas_validade" as const,
    label: "Alertas de Validade",
    icon: Clock,
    variant: "destructive" as const,
  },
];

export function DashboardCards({ dados }: DashboardCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            <card.icon
              className={`size-4 ${
                card.variant === "warning"
                  ? "text-warning"
                  : card.variant === "destructive"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dados[card.key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
