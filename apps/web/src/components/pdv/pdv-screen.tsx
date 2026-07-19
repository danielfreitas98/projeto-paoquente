"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChefHat,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  Snowflake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsLink } from "@/components/layout/settings-link";
import { ProdutoSecao } from "@/components/pdv/produto-secao";
import { CarrinhoPanel } from "@/components/pdv/carrinho-panel";
import { publicConfig } from "@/lib/config";
import {
  imprimirCupomFiscal,
  verificarAgenteImpressao,
} from "@/lib/pdv/imprimir-cupom";
import type {
  CupomFiscalData,
  ItemCarrinho,
  MetodoPagamentoVenda,
  ProdutoPdv,
  RegistrarVendaResult,
} from "@/types/pdv";
import { chaveProdutoPdv } from "@/types/pdv";

interface PdvScreenProps {
  produtosIniciais?: ProdutoPdv[];
}

function agruparProdutos(produtos: ProdutoPdv[]) {
  const estoque = produtos.filter((p) => p.origem === "estoque");

  return {
    cardapio: produtos.filter((p) => p.origem === "produto"),
    acabados: estoque.filter((p) => p.categoria === "ACABADO"),
    refrigerados: estoque.filter((p) => p.categoria === "REFRIGERADO"),
    insumos: estoque.filter((p) => p.categoria === "INSUMO"),
    estoqueOutros: estoque.filter(
      (p) => !p.categoria || !["ACABADO", "REFRIGERADO", "INSUMO"].includes(p.categoria)
    ),
  };
}

function itemParaPayload(item: ItemCarrinho) {
  if (item.origem === "estoque") {
    return {
      estoque_produto_id: item.produtoId,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
    };
  }

  return {
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: item.precoUnitario,
  };
}

export function PdvScreen({ produtosIniciais = [] }: PdvScreenProps) {
  const [produtos, setProdutos] = useState<ProdutoPdv[]>(produtosIniciais);
  const [carregando, setCarregando] = useState(produtosIniciais.length === 0);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);
  const [ultimoCupom, setUltimoCupom] = useState<CupomFiscalData | null>(null);
  const [agenteOnline, setAgenteOnline] = useState<boolean | null>(null);

  const opcoesImpressao = useMemo(
    () => ({
      tamanhoPapel: publicConfig.pdv.tamanhoPapelImpressao,
      modoImpressao: publicConfig.pdv.modoImpressao,
      printAgentUrl: publicConfig.pdv.printAgentUrl,
      nomeImpressoraPadrao: publicConfig.pdv.nomeImpressoraPadrao,
    }),
    []
  );

  const imprimirUltimoCupom = useCallback(async () => {
    if (!ultimoCupom) return;

    const resultado = await imprimirCupomFiscal(ultimoCupom, opcoesImpressao);
    if (!resultado.ok) {
      setMensagem({
        tipo: "erro",
        texto: resultado.error ?? "Falha ao imprimir o cupom.",
      });
    }
  }, [ultimoCupom, opcoesImpressao]);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErroCarregamento(null);

    try {
      const response = await fetch("/api/pdv/produtos", { cache: "no-store" });
      const json = (await response.json()) as {
        success: boolean;
        data?: ProdutoPdv[];
        meta?: { total: number; cardapio: number; estoque: number };
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        setErroCarregamento(json.error ?? "Não foi possível carregar os produtos.");
        return;
      }

      setProdutos(json.data);
    } catch {
      setErroCarregamento("Falha de conexão ao carregar produtos do PDV.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  useEffect(() => {
    if (publicConfig.pdv.modoImpressao !== "agente") {
      setAgenteOnline(null);
      return;
    }

    void verificarAgenteImpressao(publicConfig.pdv.printAgentUrl).then(
      setAgenteOnline
    );
  }, []);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo?.toLowerCase().includes(termo) ?? false)
    );
  }, [busca, produtos]);

  const { cardapio, acabados, refrigerados, insumos, estoqueOutros } = useMemo(
    () => agruparProdutos(produtosFiltrados),
    [produtosFiltrados]
  );

  const totalEstoque = acabados.length + refrigerados.length + insumos.length + estoqueOutros.length;

  const adicionarProduto = useCallback((produto: ProdutoPdv) => {
    setMensagem(null);
    const chave = chaveProdutoPdv(produto);

    setCarrinho((prev) => {
      const existente = prev.find((i) => i.chave === chave);
      if (existente) {
        return prev.map((i) =>
          i.chave === chave ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [
        ...prev,
        {
          chave,
          origem: produto.origem,
          produtoId: produto.id,
          nome: produto.nome,
          precoUnitario: produto.preco_venda,
          quantidade: 1,
        },
      ];
    });
  }, []);

  const alterarQuantidade = useCallback((chave: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) =>
          item.chave === chave
            ? { ...item, quantidade: item.quantidade + delta }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }, []);

  const removerItem = useCallback((chave: string) => {
    setCarrinho((prev) => prev.filter((i) => i.chave !== chave));
  }, []);

  async function concluirVenda(
    metodo: MetodoPagamentoVenda,
    valorRecebido?: number
  ) {
    if (carrinho.length === 0) return;

    const carrinhoAtual = [...carrinho];
    setProcessando(true);
    setMensagem(null);

    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: carrinho.map(itemParaPayload),
          desconto: 0,
          metodo_pagamento: metodo,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        data?: RegistrarVendaResult;
        error?: string;
      };

      if (!response.ok || !json.success || !json.data) {
        setMensagem({
          tipo: "erro",
          texto: json.error ?? "Erro ao registrar a venda.",
        });
        return;
      }

      const totalLiquido = json.data.total_liquido;
      const cupom: CupomFiscalData = {
        vendaId: json.data.venda_id,
        dataVenda: new Date(),
        nomeEmpresa: publicConfig.app.nomeEmpresa,
        itens: carrinhoAtual.map((item) => ({
          nome: item.nome,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),
        totalBruto: json.data.total_bruto,
        desconto: json.data.desconto,
        totalLiquido,
        metodoPagamento: metodo,
        valorRecebido: metodo === "DINHEIRO" ? valorRecebido : undefined,
        troco:
          metodo === "DINHEIRO" && valorRecebido !== undefined
            ? Math.max(0, valorRecebido - totalLiquido)
            : undefined,
        mensagemRodape: publicConfig.pdv.mensagemRodapeCupom,
      };

      setUltimoCupom(cupom);
      setCarrinho([]);
      setMensagem({
        tipo: "sucesso",
        texto: `Venda concluída! Total: R$ ${totalLiquido.toFixed(2).replace(".", ",")}`,
      });

      if (publicConfig.pdv.imprimirCupomAutomatico) {
        const resultado = await imprimirCupomFiscal(cupom, opcoesImpressao);
        if (!resultado.ok) {
          setMensagem({
            tipo: "erro",
            texto: `Venda concluída, mas a impressão falhou: ${resultado.error}`,
          });
        }
      }
    } catch {
      setMensagem({
        tipo: "erro",
        texto: "Falha de conexão. Tente novamente.",
      });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <div className="flex items-center gap-2">
          <Image
            src="/swm-crm-logo.png"
            alt={publicConfig.app.nomeApp}
            width={32}
            height={32}
            className="rounded-lg object-contain"
          />
          <div>
            <p className="text-sm font-bold leading-none">PDV — Frente de Caixa</p>
            <p className="text-xs text-muted-foreground">
              {publicConfig.app.nomeApp}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {publicConfig.pdv.modoImpressao === "agente" && agenteOnline !== null && (
            <span
              className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${
                agenteOnline
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
              title={
                agenteOnline
                  ? "Agente de impressão conectado"
                  : "Agente de impressão offline — execute npm run print-agent"
              }
            >
              {agenteOnline ? "Impressora pronta" : "Agente offline"}
            </span>
          )}
          {ultimoCupom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void imprimirUltimoCupom()}
              title={`Imprimir cupom (${publicConfig.pdv.tamanhoPapelImpressao})`}
            >
              <Printer className="size-4" />
              <span className="hidden sm:inline">Imprimir Cupom</span>
            </Button>
          )}
          <SettingsLink variant="outline" size="sm" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void carregarProdutos()}
            disabled={carregando}
          >
            <RefreshCw className={`size-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        {mensagem && (
          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                mensagem.tipo === "sucesso"
                  ? "bg-green-100 text-green-800"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {mensagem.texto}
            </div>
            {mensagem.tipo === "sucesso" && ultimoCupom && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void imprimirUltimoCupom()}
              >
                <Printer className="size-4" />
                Imprimir
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-r border-border">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código (cardápio e estoque)..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-12 pl-10 text-base"
                autoFocus
              />
            </div>
            {!busca && !carregando && (
              <p className="mt-2 text-xs text-muted-foreground">
                {produtos.length} produtos — {cardapio.length} cardápio, {totalEstoque} estoque
              </p>
            )}
            {erroCarregamento && (
              <p className="mt-2 text-sm text-destructive">{erroCarregamento}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {carregando ? (
              <p className="py-12 text-center text-muted-foreground">
                Carregando produtos...
              </p>
            ) : produtosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>Nenhum produto encontrado.</p>
                {busca && (
                  <p className="mt-2 text-sm">
                    Tente buscar pelo código ou nome cadastrado em Estoque.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <ProdutoSecao
                  titulo="Cardápio"
                  icone={ChefHat}
                  produtos={cardapio}
                  destaqueIds={new Set()}
                  onAdicionar={adicionarProduto}
                />
                <ProdutoSecao
                  titulo="Produtos acabados"
                  icone={ShoppingBag}
                  produtos={acabados}
                  destaqueIds={new Set()}
                  onAdicionar={adicionarProduto}
                />
                <ProdutoSecao
                  titulo="Refrigerados"
                  icone={Snowflake}
                  produtos={refrigerados}
                  destaqueIds={new Set()}
                  onAdicionar={adicionarProduto}
                />
                <ProdutoSecao
                  titulo="Insumos"
                  icone={Package}
                  produtos={insumos}
                  destaqueIds={new Set()}
                  onAdicionar={adicionarProduto}
                />
                <ProdutoSecao
                  titulo="Estoque"
                  icone={Package}
                  produtos={estoqueOutros}
                  destaqueIds={new Set()}
                  onAdicionar={adicionarProduto}
                />
              </div>
            )}
          </div>
        </section>

        <aside className="w-full max-w-md shrink-0">
          <CarrinhoPanel
            itens={carrinho}
            desconto={0}
            onAlterarQuantidade={alterarQuantidade}
            onRemoverItem={removerItem}
            onConcluirVenda={concluirVenda}
            processando={processando}
          />
        </aside>
      </div>
    </div>
  );
}
