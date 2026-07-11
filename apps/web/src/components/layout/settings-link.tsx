"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsLinkProps {
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

export function SettingsLink({
  className,
  showLabel = false,
  variant = "ghost",
  size = "icon",
}: SettingsLinkProps) {
  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn(className)}
      title="Configurações"
    >
      <Link href="/configuracoes">
        <Settings className="size-4" />
        {showLabel && <span>Configurações</span>}
      </Link>
    </Button>
  );
}
