import Link from "next/link";
import { ChefHat, Wallet, Package, ShoppingCart, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { publicConfig } from "@/lib/config";
import type { AppModule } from "@/lib/config";

const modules: Array<{
  module: AppModule;
  title: string;
  description: string;
  href: string;
  icon: typeof ChefHat;
}> = [
  {
    module: "pdv",
    title: "PDV — Frente de Caixa",
    description:
      "Registre vendas rapidamente, baixe estoque automaticamente e gere receita financeira.",
    href: "/pdv",
    icon: ShoppingCart,
  },
  {
    module: "produtos",
    title: "Ficha Técnica",
    description:
      "Cadastre produtos, monte receitas com insumos e calcule CMV e margem em tempo real.",
    href: "/produtos",
    icon: ChefHat,
  },
  {
    module: "estoque",
    title: "Controle de Estoque",
    description:
      "Gerencie insumos, produtos acabados e refrigerados. Importe NF-e e controle validade.",
    href: "/estoque",
    icon: Package,
  },
  {
    module: "financeiro",
    title: "Gestão Financeira",
    description:
      "Acompanhe receitas, despesas, fluxo de caixa e DRE simplificado do mês.",
    href: "/financeiro",
    icon: Wallet,
  },
];

const enabledModules = modules.filter(
  (mod) => publicConfig.features[mod.module]
);

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {publicConfig.app.nomeEmpresa}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          CRM + Gestão Financeira para padarias e casas de café. Controle
          fichas técnicas, custos e resultados em um só lugar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enabledModules.map((mod) => (
          <Card key={mod.href} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <mod.icon className="size-5 text-primary" />
              </div>
              <CardTitle className="mt-3">{mod.title}</CardTitle>
              <CardDescription>{mod.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={mod.href}>
                  Acessar módulo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
