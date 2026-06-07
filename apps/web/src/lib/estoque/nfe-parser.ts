import { XMLParser } from "fast-xml-parser";
import type { ItemNfeXml, NfeParsed } from "@/types/estoque";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractInfNfe(parsed: Record<string, unknown>): Record<string, unknown> | null {
  const nfeProc = parsed.nfeProc as Record<string, unknown> | undefined;
  if (nfeProc?.NFe) {
    const nfe = nfeProc.NFe as Record<string, unknown>;
    return (nfe.infNFe ?? nfe) as Record<string, unknown>;
  }

  const nfe = parsed.NFe as Record<string, unknown> | undefined;
  if (nfe?.infNFe) return nfe.infNFe as Record<string, unknown>;
  if (parsed.infNFe) return parsed.infNFe as Record<string, unknown>;

  return null;
}

function extractChaveNfe(infNfe: Record<string, unknown>, parsed: Record<string, unknown>): string {
  const id = infNfe["@_Id"] as string | undefined;
  if (id) return id.replace(/^NFe/, "");

  const nfeProc = parsed.nfeProc as Record<string, unknown> | undefined;
  const protNFe = nfeProc?.protNFe as Record<string, unknown> | undefined;
  const infProt = protNFe?.infProt as Record<string, unknown> | undefined;
  if (infProt?.chNFe) return String(infProt.chNFe);

  const ide = infNfe.ide as Record<string, unknown> | undefined;
  if (ide) {
    const cUF = String(ide.cUF ?? "");
    const dhEmi = String(ide.dhEmi ?? ide.dEmi ?? "");
    const nNF = String(ide.nNF ?? "");
    const serie = String(ide.serie ?? "");
    const cnpj = String((infNfe.emit as Record<string, unknown>)?.CNPJ ?? "");
    if (cUF && nNF) return `${cUF}${cnpj}${serie}${nNF}${dhEmi}`.slice(0, 44);
  }

  throw new Error("Não foi possível extrair a chave da NF-e do XML.");
}

function parseDate(value: unknown): string {
  const str = String(value ?? "");
  if (!str) return new Date().toISOString().slice(0, 10);
  return str.slice(0, 10);
}

function parseNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function parseNfeXml(xmlContent: string): NfeParsed {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlContent) as Record<string, unknown>;
  } catch {
    throw new Error("XML inválido. Verifique o arquivo e tente novamente.");
  }

  const infNfe = extractInfNfe(parsed);
  if (!infNfe) {
    throw new Error("Estrutura de NF-e não reconhecida no XML.");
  }

  const ide = infNfe.ide as Record<string, unknown>;
  const emit = infNfe.emit as Record<string, unknown>;
  const total = infNfe.total as Record<string, unknown>;
  const icmsTot = total?.ICMSTot as Record<string, unknown>;

  const chaveNfe = extractChaveNfe(infNfe, parsed);
  const numeroNota = String(ide?.nNF ?? "");
  const fornecedorCnpj = String(emit?.CNPJ ?? emit?.CPF ?? "").replace(/\D/g, "");
  const fornecedorRazaoSocial = String(emit?.xNome ?? "Fornecedor não identificado");
  const dataEmissao = parseDate(ide?.dhEmi ?? ide?.dEmi);
  const valorTotal = parseNumber(icmsTot?.vNF ?? icmsTot?.vProd ?? 0);

  const detalhes = asArray(infNfe.det);
  const itens: ItemNfeXml[] = detalhes.map((det) => {
    const prod = (det as Record<string, unknown>).prod as Record<string, unknown>;
    const quantidade = parseNumber(prod?.qCom ?? prod?.qTrib ?? 0);
    const valorUnitario = parseNumber(prod?.vUnCom ?? prod?.vUnTrib ?? 0);

    return {
      codigo: prod?.cProd ? String(prod.cProd) : null,
      descricao: String(prod?.xProd ?? "Produto sem descrição"),
      quantidade,
      valorUnitario,
    };
  });

  if (itens.length === 0) {
    throw new Error("Nenhum item encontrado na NF-e.");
  }

  if (!fornecedorCnpj) {
    throw new Error("CNPJ do fornecedor não encontrado no XML.");
  }

  return {
    chaveNfe,
    numeroNota,
    fornecedorCnpj,
    fornecedorRazaoSocial,
    dataEmissao,
    valorTotal,
    itens,
  };
}
