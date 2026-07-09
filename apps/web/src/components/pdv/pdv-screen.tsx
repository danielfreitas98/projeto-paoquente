"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Wheat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProdutoCard } from "@/components/pdv/produto-card";
import { CarrinhoPanel } from "@/components/pdv/carrinho-panel";
import type {
  ItemCarrinho,
  MetodoPagamentoVenda,
  ProdutoPdv,
  RegistrarVendaResult,
} from "@/types/pdv";

interface PdvScreenProps {
  produtos: ProdutoPdv[];
  produtosDestaque: ProdutoPdv[];
}

export function PdvScreen({ produtos, produtosDestaque }: PdvScreenProps) {
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtosDestaque;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo?.toLowerCase().includes(termo) ?? false)
    );
  }, [busca, produtos, produtosDestaque]);

  const adicionarProduto = useCallback((produto: ProdutoPdv) => {
    setMensagem(null);
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.produtoId === produto.id);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produto.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          precoUnitario: produto.preco_venda,
          quantidade: 1,
        },
      ];
    });
  }, []);

  const alterarQuantidade = useCallback((produtoId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) =>
          item.produtoId === produtoId
            ? { ...item, quantidade: item.quantidade + delta }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }, []);

  const removerItem = useCallback((produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }, []);

  async function concluirVenda(
    metodo: MetodoPagamentoVenda,
    _valorRecebido?: number
  ) {
    if (carrinho.length === 0) return;

    setProcessando(true);
    setMensagem(null);

    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: carrinho.map((item) => ({
            produto_id: item.produtoId,
            quantidade: item.quantidade,
            preco_unitario: item.precoUnitario,
          })),
          desconto: 0,
          metodo_pagamento: metodo,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        data?: RegistrarVendaResult;
        error?: string;
      };

      if (!response.ok || !json.success) {
        setMensagem({
          tipo: "erro",
          texto: json.error ?? "Erro ao registrar a venda.",
        });
        return;
      }

      setCarrinho([]);
      setMensagem({
        tipo: "sucesso",
        texto: `Venda concluída! Total: R$ ${json.data?.total_liquido.toFixed(2).replace(".", ",")}`,
      });
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Falha de conexão. Tente novamente.",
      });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wheat className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">PDV — Frente de Caixa</p>
            <p className="text-xs text-muted-foreground">Pão Quente</p>
          </div>
        </div>
        {mensagem && (
          <div
            className={`ml-auto rounded-lg px-3 py-1.5 text-sm font-medium ${
              mensagem.tipo === "sucesso"
                ? "bg-green-100 text-green-800"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {mensagem.texto}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-r border-border">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-12 pl-10 text-base"
                autoFocus
              />
            </div>
            {!busca && (
              <p className="mt-2 text-xs text-muted-foreground">
                Produtos mais vendidos — clique para adicionar ao carrinho
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {produtosFiltrados.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                Nenhum produto encontrado.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {produtosFiltrados.map((produto) => (
                  <ProdutoCard
                    key={produto.id}
                    produto={produto}
                    onClick={adicionarProduto}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="w-full max-w-md shrink-0">
          <CarrinhoPanel
            itens={carrinho}
            desconto={0}
            onAlterarQuantidade={alterarQuantidade}
            onRemoverItem={removerItem}
            onConcluirVenda={concluirVenda}
            processando={processando}
          />
        </aside>
      </div>
    </div>
  );
}
