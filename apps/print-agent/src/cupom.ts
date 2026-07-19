export type MetodoPagamentoVenda = "DINHEIRO" | "PIX" | "CARTAO";

export interface CupomFiscalItem {
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export interface CupomFiscalPayload {
  vendaId: string;
  dataVenda: string;
  nomeEmpresa: string;
  itens: CupomFiscalItem[];
  totalBruto: number;
  desconto: number;
  totalLiquido: number;
  metodoPagamento: MetodoPagamentoVenda;
  valorRecebido?: number;
  troco?: number;
  mensagemRodape: string;
}

export type TamanhoPapelImpressao = "80mm" | "58mm";

export interface ImprimirRequest {
  cupom: CupomFiscalPayload;
  tamanhoPapel: TamanhoPapelImpressao;
  nomeImpressora?: string;
}

const METODO_LABELS: Record<MetodoPagamentoVenda, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO: "Cartão",
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function larguraLinha(tamanhoPapel: TamanhoPapelImpressao): number {
  return tamanhoPapel === "58mm" ? 32 : 48;
}

function linhaSeparadora(largura: number): string {
  return "-".repeat(largura);
}

function quebrarTexto(texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;
    if (candidato.length <= largura) {
      atual = candidato;
      continue;
    }

    if (atual) linhas.push(atual);
    if (palavra.length > largura) {
      for (let i = 0; i < palavra.length; i += largura) {
        linhas.push(palavra.slice(i, i + largura));
      }
      atual = "";
    } else {
      atual = palavra;
    }
  }

  if (atual) linhas.push(atual);
  return linhas.length > 0 ? linhas : [""];
}

function linhaDuasColunas(
  esquerda: string,
  direita: string,
  largura: number
): string {
  const espaco = largura - direita.length;
  if (espaco <= esquerda.length) {
    return `${esquerda.slice(0, Math.max(1, espaco - 1))}${direita}`;
  }
  return `${esquerda.padEnd(espaco)}${direita}`;
}

function centralizar(texto: string, largura: number): string {
  if (texto.length >= largura) return texto.slice(0, largura);
  const pad = Math.floor((largura - texto.length) / 2);
  return `${" ".repeat(pad)}${texto}`;
}

export function gerarLinhasCupom(
  cupom: CupomFiscalPayload,
  tamanhoPapel: TamanhoPapelImpressao
): string[] {
  const largura = larguraLinha(tamanhoPapel);
  const linhas: string[] = [];

  linhas.push(centralizar(cupom.nomeEmpresa.toUpperCase(), largura));
  linhas.push(centralizar("Cupom nao fiscal", largura));
  linhas.push(centralizar(formatarData(cupom.dataVenda), largura));
  linhas.push(linhaSeparadora(largura));

  for (const item of cupom.itens) {
    const totalItem = item.precoUnitario * item.quantidade;
    for (const linhaNome of quebrarTexto(item.nome, largura)) {
      linhas.push(linhaNome);
    }
    linhas.push(
      linhaDuasColunas(
        `${item.quantidade} x ${formatarMoeda(item.precoUnitario)}`,
        formatarMoeda(totalItem),
        largura
      )
    );
  }

  linhas.push(linhaSeparadora(largura));
  linhas.push(
    linhaDuasColunas("Subtotal", formatarMoeda(cupom.totalBruto), largura)
  );

  if (cupom.desconto > 0) {
    linhas.push(
      linhaDuasColunas("Desconto", `-${formatarMoeda(cupom.desconto)}`, largura)
    );
  }

  linhas.push(
    linhaDuasColunas("TOTAL", formatarMoeda(cupom.totalLiquido), largura)
  );
  linhas.push(linhaSeparadora(largura));
  linhas.push(
    linhaDuasColunas(
      "Pagamento",
      METODO_LABELS[cupom.metodoPagamento],
      largura
    )
  );

  if (
    cupom.metodoPagamento === "DINHEIRO" &&
    cupom.valorRecebido !== undefined &&
    cupom.troco !== undefined
  ) {
    linhas.push(
      linhaDuasColunas("Recebido", formatarMoeda(cupom.valorRecebido), largura)
    );
    linhas.push(
      linhaDuasColunas("Troco", formatarMoeda(cupom.troco), largura)
    );
  }

  linhas.push(linhaSeparadora(largura));
  linhas.push(centralizar(`Venda: ${cupom.vendaId.slice(0, 8)}`, largura));
  for (const linhaRodape of quebrarTexto(cupom.mensagemRodape, largura)) {
    linhas.push(centralizar(linhaRodape, largura));
  }

  return linhas;
}
