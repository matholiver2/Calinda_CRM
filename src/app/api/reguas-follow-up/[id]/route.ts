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
  const regua = await prisma.reguaFollowUp.findUnique({ where: { id } });
  if (!regua || regua.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Marco da régua não encontrado" }, { status: 404 });
  }

  await prisma.reguaFollowUp.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
