const STORAGE_KEY = "pdv:nome-impressora";

export function obterNomeImpressoraSalvo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function salvarNomeImpressora(nome: string): void {
  if (typeof window === "undefined") return;
  const valor = nome.trim();
  if (valor) {
    localStorage.setItem(STORAGE_KEY, valor);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function resolverNomeImpressora(padrao?: string): string | undefined {
  const salvo = obterNomeImpressoraSalvo();
  if (salvo?.trim()) return salvo.trim();
  const fallback = padrao?.trim();
  return fallback || undefined;
}

export async function listarImpressorasDisponiveis(
  printAgentUrl: string
): Promise<string[]> {
  const response = await fetch(`${printAgentUrl}/impressoras`, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
  });

  const json = (await response.json()) as {
    ok?: boolean;
    impressoras?: string[];
    error?: string;
  };

  if (!response.ok || !json.ok || !json.impressoras) {
    throw new Error(json.error ?? "Não foi possível listar as impressoras.");
  }

  return json.impressoras;
}
