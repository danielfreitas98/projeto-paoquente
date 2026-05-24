"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatCurrency } from "@/lib/utils";
import type { Insumo } from "@/lib/ficha-tecnica/calculations";
import { formatUnidade } from "@/lib/ficha-tecnica/calculations";

interface InsumoComboboxProps {
  insumos: Insumo[];
  value: Insumo | null;
  onSelect: (insumo: Insumo) => void;
  disabledIds?: string[];
}

export function InsumoCombobox({
  insumos,
  value,
  onSelect,
  disabledIds = [],
}: InsumoComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? value.nome : "Buscar insumo..."}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite o nome do insumo..." />
          <CommandList>
            <CommandEmpty>Nenhum insumo encontrado.</CommandEmpty>
            <CommandGroup>
              {insumos.map((insumo) => {
                const disabled = disabledIds.includes(insumo.id);
                return (
                  <CommandItem
                    key={insumo.id}
                    value={insumo.nome}
                    disabled={disabled}
                    onSelect={() => {
                      onSelect(insumo);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value?.id === insumo.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 flex-col">
                      <span>{insumo.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(insumo.custoUnitario)}/{formatUnidade(insumo.unidadeMedida)}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
