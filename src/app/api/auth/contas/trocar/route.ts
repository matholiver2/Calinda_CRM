import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";
import { CONTAS_COOKIE, parseTokens } from "@/lib/multiConta";

export async function POST(req: Request) {
  const store = await cookies();
  const tokenAtivo = store.get(AUTH_COOKIE)?.value;
  if (!tokenAtivo || !verifyToken(tokenAtivo)) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const usuarioId = String(body?.usuarioId ?? "");
  if (!usuarioId) return NextResponse.json({ erro: "usuarioId é obrigatório" }, { status: 400 });

  const tokensSalvos = parseTokens(store.get(CONTAS_COOKIE)?.value);
  const alvo = [tokenAtivo, ...tokensSalvos].find((t) => verifyToken(t)?.id === usuarioId);
  if (!alvo) return NextResponse.json({ erro: "Conta não encontrada — adicione ela primeiro" }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, alvo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
