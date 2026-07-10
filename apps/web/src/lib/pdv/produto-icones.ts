import {
  Coffee,
  Croissant,
  Cookie,
  Sandwich,
  Wheat,
  CupSoda,
  CakeSlice,
  Package,
  Snowflake,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /caf[eé]|cappuccino|expresso|latte|mocha/i, icon: Coffee },
  { match: /croissant|p[aã]o franc[eê]s|baguete/i, icon: Croissant },
  { match: /queijo|salgado|coxinha|empada|chipa/i, icon: Cookie },
  { match: /sandu[ií]che|tosta|bagel/i, icon: Sandwich },
  { match: /bolo|torta|doce|brigadeiro/i, icon: CakeSlice },
  { match: /suco|refrigerante|ch[aá]|leite|vitamil|chocomil/i, icon: CupSoda },
  { match: /p[aã]o/i, icon: Wheat },
];

export function iconeProduto(nome: string, categoria?: string | null): LucideIcon {
  if (categoria === "REFRIGERADO") return Snowflake;
  if (categoria === "ACABADO") return ShoppingBag;

  for (const rule of ICON_RULES) {
    if (rule.match.test(nome)) return rule.icon;
  }
  return Package;
}

export function corProduto(nome: string, categoria?: string | null): string {
  if (categoria === "REFRIGERADO") return "bg-sky-100 text-sky-800";
  if (categoria === "ACABADO") return "bg-emerald-100 text-emerald-800";
  if (/caf[eé]|cappuccino/i.test(nome)) return "bg-amber-100 text-amber-800";
  if (/p[aã]o|croissant/i.test(nome)) return "bg-orange-100 text-orange-800";
  if (/queijo|salgado/i.test(nome)) return "bg-yellow-100 text-yellow-800";
  if (/bolo|doce/i.test(nome)) return "bg-pink-100 text-pink-800";
  return "bg-stone-100 text-stone-700";
}

export function labelCategoriaEstoque(categoria?: string | null): string | null {
  if (categoria === "ACABADO") return "Produto acabado";
  if (categoria === "REFRIGERADO") return "Refrigerado";
  if (categoria === "INSUMO") return "Insumo";
  return null;
}
