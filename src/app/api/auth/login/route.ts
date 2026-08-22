import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
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
      { erro: "Esta conta usa login com Google. Entre com o botão \"Entrar com Google\"." },
      { status: 401 }
    );
  }

  const senhaOk = await comparePassword(senha, usuario.senhaHash);
  if (!senhaOk) {
    return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
  }

  const token = signToken({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    empresaId: usuario.empresaId,
  });

  const res = NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      avatarCor: usuario.avatarCor,
      empresaId: usuario.empresaId,
    },
  });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
