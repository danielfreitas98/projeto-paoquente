"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import type { ItemCarrinho, MetodoPagamentoVenda } from "@/types/pdv";

interface CarrinhoPanelProps {
  itens: ItemCarrinho[];
  desconto: number;
  onAlterarQuantidade: (produtoId: string, delta: number) => void;
  onRemoverItem: (produtoId: string) => void;
  onConcluirVenda: (
    metodo: MetodoPagamentoVenda,
    valorRecebido?: number
  ) => Promise<void>;
  processando: boolean;
}

const METODOS: Array<{
  id: MetodoPagamentoVenda;
  label: string;
  icon: typeof Banknote;
}> = [
  { id: "DINHEIRO", label: "Dinheiro", icon: Banknote },
  { id: "PIX", label: "Pix", icon: QrCode },
  { id: "CARTAO", label: "Cartão", icon: CreditCard },
];

export function CarrinhoPanel({
  itens,
  desconto,
  onAlterarQuantidade,
  onRemoverItem,
  onConcluirVenda,
  processando,
}: CarrinhoPanelProps) {
  const [modalAberta, setModalAberta] = useState(false);
  const [metodoSelecionado, setMetodoSelecionado] =
    useState<MetodoPagamentoVenda>("DINHEIRO");
  const [valorRecebido, setValorRecebido] = useState("");

  const totalBruto = itens.reduce(
    (acc, item) => acc + item.precoUnitario * item.quantidade,
    0
  );
  const totalLiquido = Math.max(0, totalBruto - desconto);
  const recebido = parseFloat(valorRecebido.replace(",", ".")) || 0;
  const troco =
    metodoSelecionado === "DINHEIRO" ? Math.max(0, recebido - totalLiquido) : 0;
  const podeConfirmar =
    metodoSelecionado !== "DINHEIRO" || recebido >= totalLiquido;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F8" && itens.length > 0 && !processando) {
        e.preventDefault();
        setModalAberta(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itens.length, processando]);

  function abrirModal() {
    setMetodoSelecionado("DINHEIRO");
    setValorRecebido(totalLiquido.toFixed(2));
    setModalAberta(true);
  }

  async function confirmarVenda() {
    await onConcluirVenda(
      metodoSelecionado,
      metodoSelecionado === "DINHEIRO" ? recebido : undefined
    );
    setModalAberta(false);
    setValorRecebido("");
  }

  return (
    <>
      <div className="flex h-full flex-col bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Cupom Atual</h2>
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {itens.length} {itens.length === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {itens.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShoppingCart className="size-12 opacity-30" />
              <p className="text-sm">Nenhum item no carrinho</p>
              <p className="text-xs">Clique nos produtos para adicionar</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {itens.map((item) => (
                <li
                  key={item.produtoId}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.precoUnitario)} × {item.quantidade}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => onAlterarQuantidade(item.produtoId, -1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">
                      {item.quantidade}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => onAlterarQuantidade(item.produtoId, 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoverItem(item.produtoId)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <p className="w-20 text-right text-sm font-bold">
                    {formatCurrency(item.precoUnitario * item.quantidade)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 p-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(totalBruto)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Desconto</span>
                <span>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-2xl font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalLiquido)}</span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-4 h-14 w-full text-base font-bold"
            disabled={itens.length === 0 || processando}
            onClick={abrirModal}
          >
            {processando ? "Processando..." : "Concluir Venda (F8)"}
          </Button>
        </div>
      </div>

      <Dialog open={modalAberta} onOpenChange={setModalAberta}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
            <DialogDescription>
              Total a pagar:{" "}
              <span className="font-bold text-foreground">
                {formatCurrency(totalLiquido)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            {METODOS.map((metodo) => (
              <button
                key={metodo.id}
                type="button"
                onClick={() => setMetodoSelecionado(metodo.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  metodoSelecionado === metodo.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                )}
              >
                <metodo.icon className="size-6" />
                <span className="text-sm font-medium">{metodo.label}</span>
              </button>
            ))}
          </div>

          {metodoSelecionado === "DINHEIRO" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Valor recebido
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                />
              </div>
              {recebido >= totalLiquido && (
                <div className="rounded-lg bg-green-50 px-4 py-3 text-center dark:bg-green-950/30">
                  <p className="text-sm text-muted-foreground">Troco</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(troco)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAberta(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarVenda}
              disabled={!podeConfirmar || processando}
            >
              {processando ? "Finalizando..." : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
