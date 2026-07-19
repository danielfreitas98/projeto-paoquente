"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChefHat,
  Wallet,
  Package,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { publicConfig } from "@/lib/config";
import type { AppModule } from "@/lib/config";
import {
  NOME_EMPRESA_CHANGED_EVENT,
  resolverNomeEmpresa,
} from "@/lib/config/empresa-storage";
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

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/swm-crm-logo.png"
      alt={publicConfig.app.nomeApp}
      width={size}
      height={size}
      className="rounded-lg object-contain"
      priority
    />
  );
}

function AppFooter() {
  const { desenvolvedorNome, desenvolvedorCnpj, desenvolvedorContato, nomeApp } =
    publicConfig.app;

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left sm:px-6 lg:px-8">
        <p>
          {nomeApp} · Desenvolvido por{" "}
          <span className="font-medium text-foreground">{desenvolvedorNome}</span>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>CNPJ {desenvolvedorCnpj}</span>
          <a
            href={`tel:${desenvolvedorContato.replace(/\s/g, "")}`}
            className="hover:text-foreground hover:underline"
          >
            {desenvolvedorContato}
          </a>
        </p>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPdv = pathname.startsWith("/pdv");
  const [nomeEmpresa, setNomeEmpresa] = useState(publicConfig.app.nomeEmpresa);

  useEffect(() => {
    const sincronizar = () => {
      setNomeEmpresa(resolverNomeEmpresa(publicConfig.app.nomeEmpresa));
    };

    sincronizar();
    window.addEventListener(NOME_EMPRESA_CHANGED_EVENT, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(NOME_EMPRESA_CHANGED_EVENT, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  if (isPdv) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="text-sm font-bold leading-none">
                {publicConfig.app.nomeApp}
              </p>
              <p className="text-xs text-muted-foreground">{nomeEmpresa}</p>
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <AppFooter />
    </div>
  );
}
