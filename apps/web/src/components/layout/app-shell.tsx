"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChefHat,
  Wallet,
  Wheat,
  Package,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { publicConfig } from "@/lib/config";
import type { AppModule } from "@/lib/config";
import { SettingsLink } from "@/components/layout/settings-link";

const moduleIcons: Record<AppModule, typeof LayoutDashboard> = {
  pdv: ShoppingCart,
  produtos: ChefHat,
  estoque: Package,
  financeiro: Wallet,
};

const navItems = [
  { href: "/", label: "Início", icon: LayoutDashboard, module: null as AppModule | null },
  ...(
    [
      { module: "pdv" as const, href: "/pdv", label: "PDV" },
      { module: "produtos" as const, href: "/produtos", label: "Produtos" },
      { module: "estoque" as const, href: "/estoque", label: "Estoque" },
      { module: "financeiro" as const, href: "/financeiro", label: "Financeiro" },
    ] as const
  )
    .filter((item) => publicConfig.features[item.module])
    .map((item) => ({
      ...item,
      icon: moduleIcons[item.module],
    })),
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPdv = pathname.startsWith("/pdv");

  if (isPdv) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wheat className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">
                {publicConfig.app.nomeEmpresa}
              </p>
              <p className="text-xs text-muted-foreground">
                {publicConfig.app.nomeApp}
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <SettingsLink
              className={cn(
                pathname.startsWith("/configuracoes") &&
                  "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )}
            />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
