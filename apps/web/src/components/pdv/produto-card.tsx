"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { corProduto, iconeProduto } from "@/lib/pdv/produto-icones";
import type { ProdutoPdv } from "@/types/pdv";

interface ProdutoCardProps {
  produto: ProdutoPdv;
  onClick: (produto: ProdutoPdv) => void;
}

export function ProdutoCard({ produto, onClick }: ProdutoCardProps) {
  const Icon = iconeProduto(produto.nome);

  return (
    <button
      type="button"
      onClick={() => onClick(produto)}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]"
    >
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
          corProduto(produto.nome)
        )}
      >
        <Icon className="size-8" />
      </div>
      <div className="w-full text-center">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">
          {produto.nome}
        </p>
        {produto.codigo && (
          <p className="mt-0.5 text-xs text-muted-foreground">{produto.codigo}</p>
        )}
        <p className="mt-1 text-base font-bold text-primary">
          {formatCurrency(produto.preco_venda)}
        </p>
      </div>
    </button>
  );
}
