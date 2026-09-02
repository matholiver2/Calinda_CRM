import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Shared CALINDA surface tokens — themed cards on the app shell. */
export const CARD = "rounded-[18px] bg-surface p-6 shadow-[var(--shadow-card)]";
export const CARD_LG = "rounded-[18px] bg-surface p-7 shadow-[var(--shadow-card)]";
export const INPUT =
  "w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent";

/** Converte um Prisma.Decimal (ou string/number) num number simples pra resposta JSON. */
export function decimalParaNumero(valor: unknown): number {
  if (typeof valor === "number") return valor;
  return parseFloat(String(valor));
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Forma canônica de armazenamento/busca de telefone — só dígitos, sem o
 * sufixo de JID do WhatsApp (ex: "@s.whatsapp.net"). Sem isso, o mesmo
 * número chega em formatos diferentes dependendo de quem grava (usuário
 * digitando "+55 11 9...", ou o worker do WhatsApp mandando o JID cru), e
 * uma busca por igualdade exata (empresaId+telefone) falha silenciosamente
 * criando um lead duplicado pro mesmo contato.
 */
export function normalizarTelefone(telefone: string): string {
  return telefone.split("@")[0].replace(/\D/g, "");
}

export function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 12) return telefone;
  const ddi = digitos.slice(0, 2);
  const ddd = digitos.slice(2, 4);
  const resto = digitos.slice(4);
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);
  return `+${ddi} (${ddd}) ${meio}-${fim}`;
}

const PAPEL_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  gestor: "Gestor",
  vendedor: "Vendedor",
};
export function papelLabel(papel: string): string {
  return PAPEL_LABEL[papel] ?? papel;
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  cliente: "Cliente",
  perdido: "Perdido",
  remarketing: "Remarketing",
  finalizado: "Finalizado",
};
export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
