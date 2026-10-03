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

  const followUps = await prisma.followUpAgendado.findMany({
    where: { leadId: id },
    orderBy: { criadoEm: "desc" },
    take: 15,
  });
  return NextResponse.json({ followUps });
}

/** Agenda um follow-up manual pontual (presets "em 1h/3h/amanhã" ou data customizada na tela da conversa). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const enviarEm = body?.enviarEm ? new Date(body.enviarEm) : null;
  if (!enviarEm || Number.isNaN(enviarEm.getTime()) || enviarEm.getTime() <= Date.now()) {
    return NextResponse.json({ erro: "Escolha uma data/hora no futuro" }, { status: 400 });
  }
  const textoPersonalizado = typeof body?.textoPersonalizado === "string" && body.textoPersonalizado.trim()
    ? body.textoPersonalizado.trim()
    : null;

  const followUp = await prisma.followUpAgendado.create({
    data: {
      empresaId: ctx.empresaId,
      leadId: id,
      enviarEm,
      textoPersonalizado,
      criadoPorId: session.papel === "super_admin" ? null : session.id,
    },
  });
  return NextResponse.json({ followUp }, { status: 201 });
}
