"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, ChefHat, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { InsumoCombobox } from "@/components/ficha-tecnica/insumo-combobox";
import { IngredientTable } from "@/components/ficha-tecnica/ingredient-table";
import { FinancialSummaryCard } from "@/components/ficha-tecnica/financial-summary-card";
import {
  calcularResumoFinanceiro,
  formatUnidade,
  type Insumo,
  type IngredienteFicha,
} from "@/lib/ficha-tecnica/calculations";
import { salvarFichaTecnicaAction } from "@/app/produtos/actions";
import type { FichaTecnicaInitialData } from "@/lib/supabase/queries/produtos";

interface FichaTecnicaFormProps {
  initialData: FichaTecnicaInitialData;
}

export function FichaTecnicaForm({ initialData }: FichaTecnicaFormProps) {
  const router = useRouter();
  const [produtoId, setProdutoId] = React.useState(initialData.produtoId);
  const [nomeProduto, setNomeProduto] = React.useState(initialData.nomeProduto);
  const [precoVenda, setPrecoVenda] = React.useState(initialData.precoVenda);
  const [cmvAlvo, setCmvAlvo] = React.useState(initialData.cmvAlvo);
  const [ativo, setAtivo] = React.useState(initialData.ativo);
  const [insumos] = React.useState<Insumo[]>(initialData.insumos);
  const [insumoSelecionado, setInsumoSelecionado] = React.useState<Insumo | null>(
    null
  );
  const [quantidade, setQuantidade] = React.useState("");
  const [ingredientes, setIngredientes] = React.useState<IngredienteFicha[]>(
    initialData.ingredientes
  );
  const [salvando, setSalvando] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const resumo = React.useMemo(
    () => calcularResumoFinanceiro(ingredientes, precoVenda, cmvAlvo),
    [ingredientes, precoVenda, cmvAlvo]
  );

  function handleAdicionarIngrediente() {
    if (!insumoSelecionado) return;

    const qtd = parseFloat(quantidade.replace(",", "."));
    if (!qtd || qtd <= 0) return;

    const existente = ingredientes.find(
      (item) => item.insumoId === insumoSelecionado.id
    );

    if (existente) {
      setIngredientes((prev) =>
        prev.map((item) =>
          item.insumoId === insumoSelecionado.id
            ? { ...item, quantidade: qtd }
            : item
        )
      );
    } else {
      setIngredientes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          insumoId: insumoSelecionado.id,
          nome: insumoSelecionado.nome,
          unidadeMedida: insumoSelecionado.unidadeMedida,
          quantidade: qtd,
          custoUnitario: insumoSelecionado.custoUnitario,
        },
      ]);
    }

    setInsumoSelecionado(null);
    setQuantidade("");
    setMensagem(null);
  }

  function handleRemoverIngrediente(id: string) {
    setIngredientes((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSalvar() {
    setSalvando(true);
    setMensagem(null);

    const result = await salvarFichaTecnicaAction({
      produtoId,
      nomeProduto,
      precoVenda,
      cmvAlvo,
      ativo,
      ingredientes: ingredientes.map((item) => ({
        insumoId: item.insumoId,
        quantidade: item.quantidade,
      })),
    });

    setSalvando(false);

    if (!result.success) {
      setMensagem({ tipo: "erro", texto: result.error });
      return;
    }

    setProdutoId(result.produtoId);
    setMensagem({ tipo: "sucesso", texto: "Ficha técnica salva com sucesso!" });

    if (!initialData.produtoId) {
      router.replace(`/produtos/${result.produtoId}/ficha-tecnica`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        {mensagem && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              mensagem.tipo === "sucesso"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {mensagem.tipo === "sucesso" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {mensagem.texto}
          </div>
        )}

        {insumos.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            <AlertCircle className="size-4 shrink-0" />
            Nenhum insumo disponível. Cadastre produtos com categoria &quot;Insumo&quot; no
            estoque antes de montar a ficha.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="size-5 text-primary" />
              Dados do Produto
            </CardTitle>
            <CardDescription>
              Informações básicas e composição da ficha técnica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome do Produto</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Croissant, Pão de Queijo..."
                  value={nomeProduto}
                  onChange={(e) => setNomeProduto(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço de Venda Atual (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  min={0}
                  step={0.01}
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cmvAlvo">CMV Alvo (%)</Label>
                <Input
                  id="cmvAlvo"
                  type="number"
                  min={1}
                  max={99}
                  step={0.5}
                  value={cmvAlvo}
                  onChange={(e) =>
                    setCmvAlvo(parseFloat(e.target.value) || 0)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Meta de custo sobre o preço de venda. Ex.: 30% → preço sugerido
                  = custo ÷ 0,30
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ativo">Status</Label>
                <Select
                  value={ativo ? "ativo" : "inativo"}
                  onValueChange={(value) => setAtivo(value === "ativo")}
                >
                  <SelectTrigger id="ativo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativado</SelectItem>
                    <SelectItem value="inativo">Desativado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Produtos desativados não aparecem no PDV.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingredientes / Insumos</CardTitle>
            <CardDescription>
              Adicione os insumos utilizados na produção de uma unidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
              <div className="space-y-2">
                <Label>Insumo</Label>
                <InsumoCombobox
                  insumos={insumos}
                  value={insumoSelecionado}
                  onSelect={setInsumoSelecionado}
                  disabledIds={[]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade">
                  Quantidade
                  {insumoSelecionado && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({formatUnidade(insumoSelecionado.unidadeMedida)})
                    </span>
                  )}
                </Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  disabled={!insumoSelecionado}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAdicionarIngrediente}
                  disabled={!insumoSelecionado || !quantidade}
                  className="w-full sm:w-auto"
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <Separator />

            <IngredientTable
              ingredientes={ingredientes}
              onRemove={handleRemoverIngrediente}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSalvar} disabled={salvando}>
            {salvando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {salvando ? "Salvando..." : "Salvar Ficha Técnica"}
          </Button>
        </div>
      </div>

      <aside>
        <FinancialSummaryCard resumo={resumo} cmvAlvo={cmvAlvo} />
      </aside>
    </div>
  );
}
