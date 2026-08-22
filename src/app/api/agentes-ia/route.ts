import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const agentes = await prisma.agenteIa.findMany({
    where: { empresaId: ctx.empresaId },
    include: { etapa: true },
    orderBy: { etapa: { ordem: "asc" } },
  });
  return NextResponse.json({ agentes });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  const etapaId = String(body?.etapaId ?? "");
  const persona = String(body?.persona ?? "").trim();
  const objetivo = String(body?.objetivo ?? "").trim();
  if (!nome || !etapaId || !persona || !objetivo) {
    return NextResponse.json({ erro: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const etapa = await prisma.etapaFunil.findUnique({ where: { id: etapaId } });
  if (!etapa || etapa.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Etapa inválida" }, { status: 400 });
  }

  const agente = await prisma.agenteIa.create({
    data: { empresaId: ctx.empresaId, nome, etapaId, persona, objetivo, modeloLlm: body?.modeloLlm ?? "claude-sonnet" },
  });
  return NextResponse.json({ agente }, { status: 201 });
}
