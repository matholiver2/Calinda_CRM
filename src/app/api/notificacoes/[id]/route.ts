import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao || notificacao.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Notificação não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  await prisma.notificacao.update({ where: { id }, data: { lida: body?.lida ?? true } });
  return NextResponse.json({ ok: true });
}
