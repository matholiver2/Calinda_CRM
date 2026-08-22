import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { CONTAS_COOKIE, CONTAS_COOKIE_MAX_AGE, parseTokens } from "@/lib/multiConta";

/**
 * Lista as contas conectadas neste navegador (troca rápida, tipo Google).
 * Sempre inclui a conta ativa (do cookie assiz_token) mesmo que ainda não
 * esteja salva na lista, e limpa tokens inválidos/expirados/duplicados —
 * assim o cookie assiz_contas nunca precisa ser mantido manualmente
 * sincronizado pelo login/callback do Google.
 */
export async function GET() {
  const store = await cookies();
  const tokenAtivo = store.get(AUTH_COOKIE)?.value;
  const sessionAtiva = tokenAtivo ? verifyToken(tokenAtivo) : null;
  if (!tokenAtivo || !sessionAtiva) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const tokensSalvos = parseTokens(store.get(CONTAS_COOKIE)?.value);

  const porId = new Map<string, { token: string; session: NonNullable<ReturnType<typeof verifyToken>> }>();
  for (const t of [tokenAtivo, ...tokensSalvos]) {
    const s = verifyToken(t);
    if (s && !porId.has(s.id)) porId.set(s.id, { token: t, session: s });
  }

  const contas = [...porId.values()];
  const res = NextResponse.json({
    contas: contas.map((c) => ({ id: c.session.id, nome: c.session.nome, email: c.session.email, papel: c.session.papel })),
    ativaId: sessionAtiva.id,
  });
  res.cookies.set(CONTAS_COOKIE, JSON.stringify(contas.map((c) => c.token)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONTAS_COOKIE_MAX_AGE,
  });
  return res;
}
