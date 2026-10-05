import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

async function pertenceAEmpresa(id: string, empresaId: string) {
  const tipo = await prisma.tipoFollowUp.findUnique({ where: { id } });
  return tipo && tipo.empresaId === empresaId ? tipo : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await pertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Tipo de follow-up não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const tipo = await prisma.tipoFollowUp.update({
    where: { id },
    data: {
      nome: body?.nome || undefined,
      objetivo: body?.objetivo !== undefined ? body.objetivo || null : undefined,
      canal: body?.canal === "manual" || body?.canal === "automatico" ? body.canal : undefined,
      scriptModelo: body?.scriptModelo || undefined,
      modoEnvio: body?.modoEnvio === "ia" || body?.modoEnvio === "literal" ? body.modoEnvio : undefined,
      ativo: typeof body?.ativo === "boolean" ? body.ativo : undefined,
    },
  });
  return NextResponse.json({ tipo });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await pertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Tipo de follow-up não encontrado" }, { status: 404 });
  }

  // onDelete: Cascade em ReguaFollowUp/FollowUpReguaEnvio — apagar um tipo
  // também remove os marcos da régua que o usam.
  await prisma.tipoFollowUp.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
