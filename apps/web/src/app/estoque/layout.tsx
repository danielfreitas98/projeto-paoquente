import { EstoqueNav } from "@/components/estoque/estoque-nav";

export const metadata = {
  title: "Estoque — SWM - CRM",
  description: "Controle de estoque, movimentações e importação de NF-e",
};

export default function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <EstoqueNav />
      {children}
    </div>
  );
}
