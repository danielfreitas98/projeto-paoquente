const STORAGE_KEY = "app:nome-empresa";
export const NOME_EMPRESA_CHANGED_EVENT = "app:nome-empresa-changed";

export function obterNomeEmpresaSalvo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function salvarNomeEmpresa(nome: string): void {
  if (typeof window === "undefined") return;
  const valor = nome.trim();
  if (valor) {
    localStorage.setItem(STORAGE_KEY, valor);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(NOME_EMPRESA_CHANGED_EVENT));
}

export function resolverNomeEmpresa(padrao: string): string {
  const salvo = obterNomeEmpresaSalvo();
  if (salvo?.trim()) return salvo.trim();
  return padrao.trim() || padrao;
}
