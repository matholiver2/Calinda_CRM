import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      etapaAtual: true,
      vendedor: { select: { id: true, nome: true, avatarCor: true, email: true } },
      mensagens: { orderBy: { enviadoEm: "asc" } },
      historico: { include: { etapa: true, vendedor: true }, orderBy: { entrouEm: "asc" } },
      reunioes: { orderBy: { dataHora: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      nome: body?.nome,
      email: body?.email,
      origem: body?.origem,
      vendedorId: body?.vendedorId,
      status: body?.status,
      observacoes: body?.observacoes !== undefined ? body.observacoes || null : undefined,
    },
    include: { etapaAtual: true, vendedor: true },
  });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  if (session.papel === "vendedor") return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
