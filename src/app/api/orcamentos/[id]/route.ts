import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const orcamento = await prisma.orcamento.findUnique({ where: { id } });
  if (!orcamento || orcamento.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });
  }

  await prisma.orcamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
