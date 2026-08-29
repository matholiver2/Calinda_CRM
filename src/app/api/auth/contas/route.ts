import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { resolverSessao } from "@/lib/session";
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
  const identidadeAtiva = tokenAtivo ? verifyToken(tokenAtivo) : null;
  if (!tokenAtivo || !identidadeAtiva) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const tokensSalvos = parseTokens(store.get(CONTAS_COOKIE)?.value);

  const porId = new Map<string, { token: string; identidade: NonNullable<ReturnType<typeof verifyToken>> }>();
  for (const t of [tokenAtivo, ...tokensSalvos]) {
    const identidade = verifyToken(t);
    if (identidade && !porId.has(identidade.id)) porId.set(identidade.id, { token: t, identidade });
  }

  const contas = await Promise.all(
    [...porId.values()].map(async ({ token, identidade }) => {
      const sessao = await resolverSessao(identidade);
      return { token, identidade, papel: sessao?.papel ?? null };
    })
  );
  const contasValidas = contas.filter((c) => c.papel !== null);

  const res = NextResponse.json({
    contas: contasValidas.map((c) => ({
      id: c.identidade.id,
      nome: c.identidade.nome,
      email: c.identidade.email,
      papel: c.papel,
    })),
    ativaId: identidadeAtiva.id,
  });
  res.cookies.set(CONTAS_COOKIE, JSON.stringify(contasValidas.map((c) => c.token)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONTAS_COOKIE_MAX_AGE,
  });
  return res;
}
