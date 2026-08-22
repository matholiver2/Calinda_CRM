import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { CONTAS_COOKIE, CONTAS_COOKIE_MAX_AGE, parseTokens } from "@/lib/multiConta";

/**
 * Remove uma conta da lista de troca rápida. Se for a conta ativa, troca
 * automaticamente pra outra que ainda esteja na lista (se houver) — senão
 * desloga (limpa assiz_token) e o próximo request cai no /login.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ usuarioId: string }> }) {
  const { usuarioId } = await params;
  const store = await cookies();
  const tokenAtivo = store.get(AUTH_COOKIE)?.value;
  const sessionAtiva = tokenAtivo ? verifyToken(tokenAtivo) : null;
  if (!tokenAtivo || !sessionAtiva) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const tokensSalvos = parseTokens(store.get(CONTAS_COOKIE)?.value);
  const restantes = [tokenAtivo, ...tokensSalvos].filter((t) => verifyToken(t)?.id !== usuarioId);
  const restantesUnicos = [...new Map(restantes.map((t) => [verifyToken(t)?.id, t])).values()];

  const res = NextResponse.json({ ok: true });

  if (sessionAtiva.id === usuarioId) {
    const proxima = restantesUnicos[0];
    if (proxima) {
      res.cookies.set(AUTH_COOKIE, proxima, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } else {
      res.cookies.delete(AUTH_COOKIE);
    }
  }

  res.cookies.set(CONTAS_COOKIE, JSON.stringify(restantesUnicos), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONTAS_COOKIE_MAX_AGE,
  });
  return res;
}
