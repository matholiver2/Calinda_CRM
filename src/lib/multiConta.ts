export const CONTAS_COOKIE = "assiz_contas";
export const CONTAS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function parseTokens(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}
