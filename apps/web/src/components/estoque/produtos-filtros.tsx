"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIA_LABELS } from "@/lib/estoque/schemas";

export function ProdutosFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const busca = searchParams.get("busca") ?? "";
  const categoria = searchParams.get("categoria") ?? "TODAS";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "TODAS") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/estoque/produtos?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou descrição..."
          className="pl-9"
          defaultValue={busca}
          onChange={(e) => updateParams("busca", e.target.value)}
        />
      </div>
      <Select
        value={categoria}
        onValueChange={(v) => updateParams("categoria", v)}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODAS">Todas as categorias</SelectItem>
          {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
