export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Sessão inválida (não logado, ou conta desativada por um admin nesse meio
// tempo — ver requireSession em src/lib/apiAuth.ts) — qualquer 401 de
// qualquer chamada joga pro login. Evita a pessoa continuar clicando numa
// tela com sessão morta e só descobrir o problema numa ação que falha.
let deslogandoPor401 = false;
function tratar401() {
  if (typeof window === "undefined" || deslogandoPor401) return;
  deslogandoPor401 = true;
  fetch("/api/auth/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login";
  });
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) tratar401();
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.erro ?? "Erro ao carregar dados", res.status);
  }
  return res.json();
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tratar401();
    throw new ApiError(data.erro ?? "Erro na operação", res.status);
  }
  return data;
}

export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tratar401();
    throw new ApiError(data.erro ?? "Erro na operação", res.status);
  }
  return data;
}

export async function apiDelete<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tratar401();
    throw new ApiError(data.erro ?? "Erro na operação", res.status);
  }
  return data;
}
