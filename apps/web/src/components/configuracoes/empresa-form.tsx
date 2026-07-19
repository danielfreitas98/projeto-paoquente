"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicConfig } from "@/lib/config";
import {
  obterNomeEmpresaSalvo,
  salvarNomeEmpresa,
} from "@/lib/config/empresa-storage";

export function EmpresaForm() {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  useEffect(() => {
    const salvo = obterNomeEmpresaSalvo();
    setNome(salvo?.trim() || publicConfig.app.nomeEmpresa);
  }, []);

  function salvar() {
    setSalvando(true);
    setMensagem(null);

    const valor = nome.trim();
    if (!valor) {
      setMensagem({
        tipo: "erro",
        texto: "Informe o nome da empresa.",
      });
      setSalvando(false);
      return;
    }

    salvarNomeEmpresa(valor);
    setNome(valor);
    setMensagem({
      tipo: "sucesso",
      texto: "Nome da empresa atualizado no header.",
    });
    setSalvando(false);
  }

  return (
    <div className="space-y-4 border-b border-border pb-4">
      <div className="space-y-2">
        <Label htmlFor="nome-empresa">Nome da empresa</Label>
        <Input
          id="nome-empresa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Pão Quente"
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">
          Aparece abaixo da logo no cabeçalho. Salvo neste navegador.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={salvar} disabled={salvando}>
          <Building2 className="size-4" />
          Salvar nome
        </Button>
        {mensagem && (
          <span
            className={`text-sm ${
              mensagem.tipo === "sucesso"
                ? "text-green-700 dark:text-green-400"
                : "text-destructive"
            }`}
          >
            {mensagem.texto}
          </span>
        )}
      </div>
    </div>
  );
}
