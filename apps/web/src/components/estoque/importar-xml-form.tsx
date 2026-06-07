"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { VinculacaoModal } from "@/components/estoque/vinculacao-modal";
import {
  processarXmlNfeAction,
  importarNfeAction,
} from "@/app/estoque/actions";
import type { ItemNfeComVinculacao, NfeParsed, ProdutoEstoque } from "@/types/estoque";

interface ImportarXmlFormProps {
  produtos: ProdutoEstoque[];
}

export function ImportarXmlForm({ produtos }: ImportarXmlFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [xmlContent, setXmlContent] = useState("");
  const [nfe, setNfe] = useState<NfeParsed | null>(null);
  const [itens, setItens] = useState<ItemNfeComVinculacao[]>([]);
  const [usuario, setUsuario] = useState("");
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<ItemNfeComVinculacao | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setNfe(null);
    setItens([]);

    const text = await file.text();
    setXmlContent(text);
    await processarXml(text);
  }

  async function processarXml(xml: string) {
    setLoading(true);
    setErro(null);

    const result = await processarXmlNfeAction(xml);
    setLoading(false);

    if (!result.success) {
      setErro(result.error);
      return;
    }

    setNfe(result.data!.nfe);
    setItens(result.data!.itens);
  }

  function handleVincular(produtoId: string) {
    if (!modalItem) return;

    setItens((prev) =>
      prev.map((item) =>
        item.descricao === modalItem.descricao
          ? { ...item, produtoId, vinculacaoExistente: true }
          : item
      )
    );
    setModalItem(null);
  }

  async function handleImportar() {
    if (!nfe || !xmlContent) return;

    const pendentes = itens.filter((i) => !i.produtoId);
    if (pendentes.length > 0) {
      setModalItem(pendentes[0]);
      return;
    }

    setImportando(true);
    setErro(null);

    const result = await importarNfeAction({
      xml: xmlContent,
      usuario: usuario || undefined,
      itensVinculados: itens.map((i) => ({
        descricao: i.descricao,
        produtoId: i.produtoId!,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        codigo: i.codigo,
      })),
    });

    setImportando(false);

    if (!result.success) {
      setErro(result.error);
      return;
    }

    router.push("/estoque");
    router.refresh();
  }

  const todosVinculados = itens.length > 0 && itens.every((i) => i.produtoId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload do XML
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="xml-file">Arquivo XML da NF-e</Label>
            <Input
              id="xml-file"
              ref={fileRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário responsável</Label>
            <Input
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Nome do responsável pela importação"
            />
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Processando XML...</p>
          )}

          {erro && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p>{erro}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {nfe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Dados da NF-e
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Número</p>
                <p className="font-medium">{nfe.numeroNota}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="font-medium">{nfe.fornecedorRazaoSocial}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="font-mono text-sm">{nfe.fornecedorCnpj}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Emissão</p>
                <p className="font-medium">
                  {new Date(nfe.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="font-medium">{formatCurrency(nfe.valorTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chave NF-e</p>
                <p className="font-mono text-xs break-all">{nfe.chaveNfe}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {itens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Itens da Nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição (XML)</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Vinculação</TableHead>
                  <TableHead className="w-24">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const produto = produtos.find((p) => p.id === item.produtoId);
                  return (
                    <TableRow key={item.descricao}>
                      <TableCell className="max-w-xs">
                        <p className="truncate font-medium">{item.descricao}</p>
                        {item.codigo && (
                          <p className="text-xs text-muted-foreground">Cód: {item.codigo}</p>
                        )}
                      </TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{formatCurrency(item.valorUnitario)}</TableCell>
                      <TableCell>
                        {item.produtoId ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="size-4 text-success" />
                            <span className="text-sm">
                              {produto?.codigo ?? "Vinculado"}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModalItem(item)}
                        >
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Button
              onClick={handleImportar}
              disabled={importando || !todosVinculados}
            >
              {importando
                ? "Importando..."
                : todosVinculados
                  ? "Importar e dar entrada no estoque"
                  : "Vincule todos os itens para importar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {modalItem && (
        <VinculacaoModal
          open={Boolean(modalItem)}
          descricaoXml={modalItem.descricao}
          produtos={produtos}
          onConfirm={handleVincular}
          onCancel={() => setModalItem(null)}
        />
      )}
    </div>
  );
}
