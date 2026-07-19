import type { CupomFiscalData } from "@/types/pdv";
import type { ModoImpressao, TamanhoPapelImpressao } from "@/lib/config";
import { resolverNomeImpressora } from "@/lib/pdv/impressora-storage";

const METODO_LABELS = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO: "Cartão",
} as const;

export interface OpcoesImpressaoCupom {
  tamanhoPapel: TamanhoPapelImpressao;
  modoImpressao: ModoImpressao;
  printAgentUrl: string;
  nomeImpressoraPadrao?: string;
}

export interface ResultadoImpressaoCupom {
  ok: boolean;
  modo: ModoImpressao;
  error?: string;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function estilosCupom(tamanhoPapel: TamanhoPapelImpressao): string {
  const largura = tamanhoPapel === "58mm" ? "58mm" : "80mm";
  const fontSize = tamanhoPapel === "58mm" ? "11px" : "12px";

  return `
    @page { size: ${largura} auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: ${largura};
      max-width: ${largura};
    }
    .cupom { padding: 2mm; width: 100%; }
    .centro { text-align: center; }
    .titulo { font-size: 1.15em; font-weight: bold; margin-bottom: 2px; }
    .subtitulo { font-size: 0.9em; margin-bottom: 4px; }
    .separador { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .item { margin-bottom: 4px; }
    .item-nome { font-weight: bold; word-break: break-word; }
    .item-linha { display: flex; justify-content: space-between; gap: 4px; }
    .item-total { font-weight: bold; white-space: nowrap; }
    .total-linha { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .total-final { font-size: 1.2em; font-weight: bold; margin-top: 4px; }
    .rodape { margin-top: 6px; font-size: 0.9em; text-align: center; }
    .id-venda { font-size: 0.85em; word-break: break-all; }
  `;
}

function gerarHtmlCupomFiscal(
  cupom: CupomFiscalData,
  tamanhoPapel: TamanhoPapelImpressao
): string {
  const itensHtml = cupom.itens
    .map((item) => {
      const qtdPreco = `${item.quantidade} x ${formatarMoeda(item.precoUnitario)}`;
      const total = formatarMoeda(item.precoUnitario * item.quantidade);
      return `
        <div class="item">
          <div class="item-nome">${escapeHtml(item.nome)}</div>
          <div class="item-linha">
            <span>${qtdPreco}</span>
            <span class="item-total">${total}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const descontoHtml =
    cupom.desconto > 0
      ? `<div class="total-linha"><span>Desconto</span><span>-${formatarMoeda(cupom.desconto)}</span></div>`
      : "";

  const trocoHtml =
    cupom.metodoPagamento === "DINHEIRO" &&
    cupom.valorRecebido !== undefined &&
    cupom.troco !== undefined
      ? `
        <div class="total-linha"><span>Recebido</span><span>${formatarMoeda(cupom.valorRecebido)}</span></div>
        <div class="total-linha"><span>Troco</span><span>${formatarMoeda(cupom.troco)}</span></div>
      `
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cupom ${escapeHtml(cupom.vendaId.slice(0, 8))}</title>
  <style>${estilosCupom(tamanhoPapel)}</style>
</head>
<body>
  <div class="cupom">
    <div class="centro">
      <div class="titulo">${escapeHtml(cupom.nomeEmpresa)}</div>
      <div class="subtitulo">Cupom não fiscal</div>
      <div>${formatarData(cupom.dataVenda)}</div>
    </div>
    <hr class="separador" />
    ${itensHtml}
    <hr class="separador" />
    <div class="total-linha"><span>Subtotal</span><span>${formatarMoeda(cupom.totalBruto)}</span></div>
    ${descontoHtml}
    <div class="total-linha total-final"><span>TOTAL</span><span>${formatarMoeda(cupom.totalLiquido)}</span></div>
    <hr class="separador" />
    <div class="total-linha"><span>Pagamento</span><span>${METODO_LABELS[cupom.metodoPagamento]}</span></div>
    ${trocoHtml}
    <hr class="separador" />
    <div class="rodape">
      <div class="id-venda">Venda: ${escapeHtml(cupom.vendaId)}</div>
      <div style="margin-top: 4px">${escapeHtml(cupom.mensagemRodape)}</div>
    </div>
  </div>
</body>
</html>`;
}

function imprimirViaNavegador(
  cupom: CupomFiscalData,
  tamanhoPapel: TamanhoPapelImpressao
): void {
  const html = gerarHtmlCupomFiscal(cupom, tamanhoPapel);
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  );
  iframe.setAttribute("title", "Impressão do cupom fiscal");
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const imprimir = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  if (iframe.contentWindow?.document.readyState === "complete") {
    imprimir();
  } else {
    iframe.onload = imprimir;
  }
}

async function imprimirViaAgente(
  cupom: CupomFiscalData,
  opcoes: OpcoesImpressaoCupom
): Promise<ResultadoImpressaoCupom> {
  const nomeImpressora = resolverNomeImpressora(opcoes.nomeImpressoraPadrao);

  if (!nomeImpressora) {
    return {
      ok: false,
      modo: "agente",
      error:
        "Impressora não configurada. Defina o nome em Configurações > PDV — Impressão.",
    };
  }

  try {
    const response = await fetch(`${opcoes.printAgentUrl}/imprimir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tamanhoPapel: opcoes.tamanhoPapel,
        nomeImpressora,
        cupom: {
          ...cupom,
          dataVenda: cupom.dataVenda.toISOString(),
        },
      }),
    });

    const json = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        modo: "agente",
        error:
          json.error ??
          "Agente de impressão indisponível. Inicie com: npm run print-agent",
      };
    }

    return { ok: true, modo: "agente" };
  } catch {
    return {
      ok: false,
      modo: "agente",
      error:
        "Não foi possível conectar ao agente de impressão em " +
        opcoes.printAgentUrl,
    };
  }
}

export async function verificarAgenteImpressao(
  printAgentUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${printAgentUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const json = (await response.json()) as { ok?: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
}

export async function imprimirCupomFiscal(
  cupom: CupomFiscalData,
  opcoes: OpcoesImpressaoCupom
): Promise<ResultadoImpressaoCupom> {
  if (opcoes.modoImpressao === "agente") {
    return imprimirViaAgente(cupom, opcoes);
  }

  imprimirViaNavegador(cupom, opcoes.tamanhoPapel);
  return { ok: true, modo: "navegador" };
}
