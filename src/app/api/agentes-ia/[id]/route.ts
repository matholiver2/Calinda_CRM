import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

async function pertenceAEmpresa(agenteId: string, empresaId: string) {
  const agente = await prisma.agenteIa.findUnique({ where: { id: agenteId } });
  return agente && agente.empresaId === empresaId;
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
    return NextResponse.json({ erro: "Agente não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const agente = await prisma.agenteIa.update({
    where: { id },
    data: {
      nome: body?.nome,
      persona: body?.persona,
      objetivo: body?.objetivo,
      modeloLlm: body?.modeloLlm,
      ativo: body?.ativo,
    },
  });
  return NextResponse.json({ agente });
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
    return NextResponse.json({ erro: "Agente não encontrado" }, { status: 404 });
  }

  await prisma.agenteIa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
