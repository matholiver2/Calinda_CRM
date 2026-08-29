import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";

const CONVITE_DIAS_VALIDADE = 7;

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const convites = await prisma.convite.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { criadoEm: "desc" },
    include: { convidadoPor: { select: { nome: true } } },
  });
  return NextResponse.json({ convites });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const papel = body?.papel;
  if (!email || !["admin", "gestor", "vendedor"].includes(papel)) {
    return NextResponse.json({ erro: "E-mail e papel (admin/gestor/vendedor) são obrigatórios" }, { status: 400 });
  }

  // E-mail já pode ter conta em OUTRA empresa — nesse caso o convite serve
  // pra vincular essa conta existente aqui também (ver aceitar/route.ts),
  // então só bloqueia se a pessoa já for membro DESTA empresa.
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
  if (usuarioExistente) {
    const jaMembro = await prisma.membroEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: usuarioExistente.id, empresaId: ctx.empresaId } },
    });
    if (jaMembro) {
      return NextResponse.json({ erro: "Essa pessoa já faz parte desta empresa" }, { status: 409 });
    }
  }

  const conviteExistente = await prisma.convite.findFirst({
    where: { email, empresaId: ctx.empresaId, status: "pendente" },
  });
  if (conviteExistente) {
    return NextResponse.json({ erro: "Já existe um convite pendente para esse e-mail" }, { status: 409 });
  }

  const token = randomBytes(24).toString("hex");
  const expiraEm = new Date(Date.now() + CONVITE_DIAS_VALIDADE * 24 * 60 * 60 * 1000);

  const convite = await prisma.convite.create({
    data: { email, papel, empresaId: ctx.empresaId, token, expiraEm, convidadoPorId: session.id },
  });

  return NextResponse.json({ convite }, { status: 201 });
}
