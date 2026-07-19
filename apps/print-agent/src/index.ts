import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { imprimirCupomSilencioso, listarImpressoras } from "./imprimir.js";
import type { ImprimirRequest } from "./cupom.js";

const PORT = Number(process.env.PORT ?? 9333);

function enviarJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

async function lerCorpo(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function validarPayload(body: unknown): ImprimirRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisicao invalido.");
  }

  const payload = body as Partial<ImprimirRequest>;
  if (!payload.cupom || !payload.tamanhoPapel) {
    throw new Error("Campos cupom e tamanhoPapel sao obrigatorios.");
  }

  if (payload.tamanhoPapel !== "80mm" && payload.tamanhoPapel !== "58mm") {
    throw new Error("tamanhoPapel deve ser 80mm ou 58mm.");
  }

  return payload as ImprimirRequest;
}

async function tratarRequisicao(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    enviarJson(res, 204, null);
    return;
  }

  const url = req.url ?? "/";

  if (req.method === "GET" && url === "/health") {
    enviarJson(res, 200, {
      ok: true,
      service: "print-agent",
      printer: process.env.PRINTER_NAME ?? null,
      paperWidth: process.env.PAPER_WIDTH ?? "80",
    });
    return;
  }

  if (req.method === "GET" && url === "/impressoras") {
    try {
      const impressoras = await listarImpressoras();
      enviarJson(res, 200, { ok: true, impressoras });
    } catch (error) {
      enviarJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao listar impressoras.",
      });
    }
    return;
  }

  if (req.method === "POST" && url === "/imprimir") {
    try {
      const raw = await lerCorpo(req);
      const payload = validarPayload(JSON.parse(raw));
      await imprimirCupomSilencioso(
        payload.cupom,
        payload.tamanhoPapel,
        payload.nomeImpressora
      );
      enviarJson(res, 200, { ok: true });
    } catch (error) {
      enviarJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao imprimir cupom.",
      });
    }
    return;
  }

  enviarJson(res, 404, { ok: false, error: "Rota nao encontrada." });
}

const server = createServer((req, res) => {
  void tratarRequisicao(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[print-agent] Agente de impressao em http://127.0.0.1:${PORT}`);
  console.log(
    `[print-agent] Impressora: ${process.env.PRINTER_NAME ?? "(nao configurada)"}`
  );
});
