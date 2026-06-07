"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProdutoEstoque } from "@/types/estoque";

interface VinculacaoModalProps {
  open: boolean;
  descricaoXml: string;
  produtos: ProdutoEstoque[];
  onConfirm: (produtoId: string) => void;
  onCancel: () => void;
}

export function VinculacaoModal({
  open,
  descricaoXml,
  produtos,
  onConfirm,
  onCancel,
}: VinculacaoModalProps) {
  const [produtoId, setProdutoId] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular produto do XML</DialogTitle>
          <DialogDescription>
            O item abaixo não possui vinculação com um produto interno. Selecione o produto
            correspondente no estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Descrição no XML</p>
            <p className="font-medium">{descricaoXml}</p>
          </div>

          <div className="space-y-2">
            <Label>Produto interno</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigo} — {p.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!produtoId} onClick={() => onConfirm(produtoId)}>
            Vincular e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
