import {
  CharacterSet,
  PrinterTypes,
  ThermalPrinter,
} from "node-thermal-printer";
import {
  gerarLinhasCupom,
  type CupomFiscalPayload,
  type TamanhoPapelImpressao,
} from "./cupom.js";

function obterLarguraPapel(tamanhoPapel: TamanhoPapelImpressao): number {
  if (tamanhoPapel === "58mm") return 32;
  return 48;
}

function resolverNomeImpressora(nomeInformado?: string): string {
  const nome = nomeInformado?.trim() || process.env.PRINTER_NAME?.trim();
  if (!nome) {
    throw new Error(
      "Nome da impressora nao informado. Configure em Configuracoes > PDV ou defina PRINTER_NAME no print-agent."
    );
  }
  return nome;
}

function criarImpressora(
  tamanhoPapel: TamanhoPapelImpressao,
  nomeImpressora?: string
): ThermalPrinter {
  const nome = resolverNomeImpressora(nomeImpressora);

  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${nome}`,
    characterSet: CharacterSet.PC860_PORTUGUESE,
    width: obterLarguraPapel(tamanhoPapel),
    removeSpecialCharacters: false,
    lineCharacter: "-",
  });
}

export async function imprimirCupomSilencioso(
  cupom: CupomFiscalPayload,
  tamanhoPapel: TamanhoPapelImpressao,
  nomeImpressora?: string
): Promise<void> {
  const printer = criarImpressora(tamanhoPapel, nomeImpressora);
  const linhas = gerarLinhasCupom(cupom, tamanhoPapel);

  printer.alignCenter();
  printer.bold(true);
  printer.println(linhas[0] ?? cupom.nomeEmpresa);
  printer.bold(false);
  printer.alignLeft();

  for (const linha of linhas.slice(1)) {
    printer.println(linha);
  }

  printer.newLine();
  printer.newLine();
  printer.cut();

  const sucesso = await printer.execute();
  if (!sucesso) {
    throw new Error(
      "Falha ao enviar cupom para a impressora. Verifique PRINTER_NAME e se a impressora esta ligada."
    );
  }
}

export async function listarImpressoras(): Promise<string[]> {
  return ThermalPrinter.getPrinters();
}
