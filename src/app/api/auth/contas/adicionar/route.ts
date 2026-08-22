import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { comparePassword, signToken, verifyToken, AUTH_COOKIE } from "@/lib/auth";
import { CONTAS_COOKIE, CONTAS_COOKIE_MAX_AGE, parseTokens } from "@/lib/multiConta";

/**
 * Autentica uma segunda conta e adiciona à lista de contas conectadas neste
 * navegador SEM trocar a sessão ativa — o usuário troca depois clicando na
 * conta desejada (ver POST /api/auth/contas/trocar).
 */
export async function POST(req: Request) {
  const store = await cookies();
  const tokenAtivo = store.get(AUTH_COOKIE)?.value;
  if (!tokenAtivo || !verifyToken(tokenAtivo)) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const senha = String(body?.senha ?? "");
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo) {
    return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
  }
  if (!usuario.senhaHash) {
    return NextResponse.json(
      { erro: "Esta conta usa login com Google — entre com ela normalmente pra adicioná-la aqui." },
      { status: 401 }
    );
  }
  const senhaOk = await comparePassword(senha, usuario.senhaHash);
  if (!senhaOk) {
    return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
  }

  const novoToken = signToken({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    empresaId: usuario.empresaId,
  });

  const tokensExistentes = parseTokens(store.get(CONTAS_COOKIE)?.value);
  const tokens = [tokenAtivo, ...tokensExistentes].filter((t) => verifyToken(t)?.id !== usuario.id);
  tokens.push(novoToken);

  const res = NextResponse.json({
    ok: true,
    conta: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  });
  res.cookies.set(CONTAS_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONTAS_COOKIE_MAX_AGE,
  });
  return res;
}
