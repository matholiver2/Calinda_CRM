import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

async function pertenceAEmpresa(grupoId: string, empresaId: string) {
  const grupo = await prisma.grupoCliente.findUnique({ where: { id: grupoId } });
  return grupo && grupo.empresaId === empresaId ? grupo : null;
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
    return NextResponse.json({ erro: "Grupo não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const grupo = await prisma.grupoCliente.update({
    where: { id },
    data: {
      nome: body?.nome?.trim() || undefined,
      descricao: body?.descricao !== undefined ? body.descricao?.trim() || null : undefined,
      cor: body?.cor || undefined,
    },
  });
  return NextResponse.json({ grupo });
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
    return NextResponse.json({ erro: "Grupo não encontrado" }, { status: 404 });
  }

  // Leads no grupo ficam sem grupo (onDelete: SetNull no schema) — não apaga cliente nenhum.
  await prisma.grupoCliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
