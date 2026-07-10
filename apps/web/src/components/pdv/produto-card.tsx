"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { corProduto, iconeProduto, labelCategoriaEstoque } from "@/lib/pdv/produto-icones";
import type { ProdutoPdv } from "@/types/pdv";

interface ProdutoCardProps {
  produto: ProdutoPdv;
  destaque?: boolean;
  onClick: (produto: ProdutoPdv) => void;
}

export function ProdutoCard({ produto, destaque, onClick }: ProdutoCardProps) {
  const Icon = iconeProduto(produto.nome, produto.categoria);
  const categoriaLabel = labelCategoriaEstoque(produto.categoria);

  return (
    <button
      type="button"
      onClick={() => onClick(produto)}
      className="group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]"
    >
      {destaque && (
        <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          Top
        </span>
      )}
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
          corProduto(produto.nome, produto.categoria)
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
        {categoriaLabel && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {categoriaLabel}
          </p>
        )}
        <p className="mt-1 text-base font-bold text-primary">
          {formatCurrency(produto.preco_venda)}
        </p>
      </div>
    </button>
  );
}
