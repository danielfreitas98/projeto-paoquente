"use client";

import { ProdutoCard } from "@/components/pdv/produto-card";
import { chaveProdutoPdv, type ProdutoPdv } from "@/types/pdv";
import type { LucideIcon } from "lucide-react";

interface ProdutoSecaoProps {
  titulo: string;
  icone: LucideIcon;
  produtos: ProdutoPdv[];
  destaqueIds: Set<string>;
  onAdicionar: (produto: ProdutoPdv) => void;
}

export function ProdutoSecao({
  titulo,
  icone: Icone,
  produtos,
  destaqueIds,
  onAdicionar,
}: ProdutoSecaoProps) {
  if (produtos.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-muted">
          <Icone className="size-4 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold">
          {titulo}
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({produtos.length})
          </span>
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {produtos.map((produto) => (
          <ProdutoCard
            key={chaveProdutoPdv(produto)}
            produto={produto}
            destaque={destaqueIds.has(chaveProdutoPdv(produto))}
            onClick={onAdicionar}
          />
        ))}
      </div>
    </section>
  );
}
