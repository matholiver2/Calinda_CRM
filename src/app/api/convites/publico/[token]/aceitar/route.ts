import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, comparePassword, signToken, AUTH_COOKIE } from "@/lib/auth";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

const CORES = ["#DC2626", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777"];

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  const senha = String(body?.senha ?? "");

  const convite = await prisma.convite.findUnique({ where: { token } });
  if (!convite || !convite.empresaId) return NextResponse.json({ erro: "Convite não encontrado" }, { status: 404 });
  if (convite.status !== "pendente") {
    return NextResponse.json({ erro: "Este convite já foi usado ou revogado" }, { status: 409 });
  }
  if (convite.expiraEm < new Date()) {
    return NextResponse.json({ erro: "Este convite expirou" }, { status: 409 });
  }

  const existente = await prisma.usuario.findUnique({ where: { email: convite.email } });

  let usuario: NonNullable<typeof existente>;

  if (existente) {
    // Conta já existe (de outra empresa) — o convite só vincula essa conta
    // aqui, não cria uma nova. Confirma que é a mesma pessoa pedindo a
    // senha atual em vez de deixar "assumir" a conta com uma senha nova.
    if (!existente.ativo) {
      return NextResponse.json({ erro: "Esta conta está desativada" }, { status: 403 });
    }
    if (!existente.senhaHash) {
      return NextResponse.json(
        { erro: "Essa conta usa login com Google — entre com o Google pra aceitar este convite." },
        { status: 400 }
      );
    }
    if (senha.length < 1 || !(await comparePassword(senha, existente.senhaHash))) {
      return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
    }
    const jaMembro = await prisma.membroEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: existente.id, empresaId: convite.empresaId } },
    });
    if (jaMembro) {
      return NextResponse.json({ erro: "Essa conta já faz parte desta empresa" }, { status: 409 });
    }
    usuario = existente;
  } else {
    const nome = String(body?.nome ?? "").trim();
    if (!nome || senha.length < 6) {
      return NextResponse.json({ erro: "Nome e senha (mín. 6 caracteres) são obrigatórios" }, { status: 400 });
    }
    const senhaHash = await hashPassword(senha);
    usuario = await prisma.usuario.create({
      data: { nome, email: convite.email, senhaHash, avatarCor: CORES[Math.floor(Math.random() * CORES.length)] },
    });
  }

  await prisma.membroEmpresa.create({
    data: { usuarioId: usuario.id, empresaId: convite.empresaId, papel: convite.papel as "admin" | "gestor" | "vendedor" },
  });
  await prisma.convite.update({ where: { id: convite.id }, data: { status: "aceito" } });

  const jwt = signToken({ id: usuario.id, nome: usuario.nome, email: usuario.email });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  // Convite recém-aceito vira a empresa ativa da sessão — quem já tinha
  // outra empresa ativa passa a ver a que acabou de entrar.
  res.cookies.set(EMPRESA_ATIVA_COOKIE, convite.empresaId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
