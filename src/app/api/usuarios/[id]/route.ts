import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo || alvo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  }
  if (alvo.id === session.id) {
    return NextResponse.json({ erro: "Use \"Minha conta\" para alterar o próprio usuário" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { nome: body?.nome, papel: body?.papel, ativo: body?.ativo },
    select: { id: true, nome: true, email: true, papel: true, ativo: true, avatarCor: true },
  });
  return NextResponse.json({ usuario });
}
