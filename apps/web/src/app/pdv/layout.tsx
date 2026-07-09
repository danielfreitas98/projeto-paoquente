import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDV — Frente de Caixa | Pão Quente",
  description: "Ponto de venda para padarias e cafeterias",
};

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
