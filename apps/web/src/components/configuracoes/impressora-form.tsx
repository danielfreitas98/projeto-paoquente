"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicConfig } from "@/lib/config";
import {
  listarImpressorasDisponiveis,
  obterNomeImpressoraSalvo,
  salvarNomeImpressora,
} from "@/lib/pdv/impressora-storage";

export function ImpressoraForm() {
  const [nome, setNome] = useState("");
  const [impressoras, setImpressoras] = useState<string[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  useEffect(() => {
    const salvo = obterNomeImpressoraSalvo();
    if (salvo) {
      setNome(salvo);
      return;
    }

    const padrao = publicConfig.pdv.nomeImpressoraPadrao;
    if (padrao) setNome(padrao);
  }, []);

  async function buscarImpressoras() {
    setCarregandoLista(true);
    setMensagem(null);

    try {
      const lista = await listarImpressorasDisponiveis(
        publicConfig.pdv.printAgentUrl
      );
      setImpressoras(lista);

      if (lista.length === 0) {
        setMensagem({
          tipo: "erro",
          texto: "Nenhuma impressora encontrada no sistema.",
        });
        return;
      }

      if (!nome && lista.length === 1) {
        setNome(lista[0]);
      }
    } catch {
      setMensagem({
        tipo: "erro",
        texto:
          "Agente de impressão offline. Inicie com npm run print-agent e tente novamente.",
      });
    } finally {
      setCarregandoLista(false);
    }
  }

  function salvar() {
    setSalvando(true);
    setMensagem(null);

    const valor = nome.trim();
    if (!valor) {
      setMensagem({
        tipo: "erro",
        texto: "Informe o nome da impressora.",
      });
      setSalvando(false);
      return;
    }

    salvarNomeImpressora(valor);
    setMensagem({
      tipo: "sucesso",
      texto: "Impressora salva para este computador.",
    });
    setSalvando(false);
  }

  return (
    <div className="space-y-4 border-b border-border pb-4">
      <div className="space-y-2">
        <Label htmlFor="nome-impressora">Nome da impressora</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="nome-impressora"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: EPSON TM-T20 Receipt"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void buscarImpressoras()}
            disabled={carregandoLista}
          >
            {carregandoLista ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Listar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use o nome exato exibido no Windows em Dispositivos e Impressoras.
        </p>
      </div>

      {impressoras.length > 0 && (
        <div className="space-y-2">
          <Label>Selecionar da lista</Label>
          <Select value={nome} onValueChange={setNome}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma impressora" />
            </SelectTrigger>
            <SelectContent>
              {impressoras.map((impressora) => (
                <SelectItem key={impressora} value={impressora}>
                  {impressora}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={salvar} disabled={salvando}>
          <Printer className="size-4" />
          Salvar impressora
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
