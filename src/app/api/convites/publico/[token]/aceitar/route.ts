import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, AUTH_COOKIE } from "@/lib/auth";

const CORES = ["#DC2626", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777"];

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  const senha = String(body?.senha ?? "");

  if (!nome || senha.length < 6) {
    return NextResponse.json({ erro: "Nome e senha (mín. 6 caracteres) são obrigatórios" }, { status: 400 });
  }

  const convite = await prisma.convite.findUnique({ where: { token } });
  if (!convite) return NextResponse.json({ erro: "Convite não encontrado" }, { status: 404 });
  if (convite.status !== "pendente") {
    return NextResponse.json({ erro: "Este convite já foi usado ou revogado" }, { status: 409 });
  }
  if (convite.expiraEm < new Date()) {
    return NextResponse.json({ erro: "Este convite expirou" }, { status: 409 });
  }

  const existente = await prisma.usuario.findUnique({ where: { email: convite.email } });
  if (existente) {
    return NextResponse.json({ erro: "Já existe uma conta com esse e-mail. Faça login normalmente." }, { status: 409 });
  }

  const senhaHash = await hashPassword(senha);
  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email: convite.email,
      senhaHash,
      papel: convite.papel,
      empresaId: convite.empresaId,
      avatarCor: CORES[Math.floor(Math.random() * CORES.length)],
    },
  });
  await prisma.convite.update({ where: { id: convite.id }, data: { status: "aceito" } });

  const jwt = signToken({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    empresaId: usuario.empresaId,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
