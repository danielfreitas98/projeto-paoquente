import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pão Quente — Gestão para Padarias",
  description: "CRM + Gestão Financeira para padarias e casas de café",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
