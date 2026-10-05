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

  const reguas = await prisma.reguaFollowUp.findMany({
    where: { empresaId: ctx.empresaId },
    include: { tipoFollowUp: { select: { id: true, nome: true, canal: true } } },
    orderBy: [{ perfil: "asc" }, { periodicidade: "asc" }, { diaOffset: "asc" }],
  });
  return NextResponse.json({ reguas });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const perfil = body?.perfil;
  const periodicidade = body?.periodicidade;
  const diaOffset = Number(body?.diaOffset);
  const tipoFollowUpId = String(body?.tipoFollowUpId ?? "");

  if (!["a", "b", "c"].includes(perfil) || !["trimestral", "semestral", "anual"].includes(periodicidade)) {
    return NextResponse.json({ erro: "Perfil ou periodicidade inválidos" }, { status: 400 });
  }
  if (!Number.isFinite(diaOffset) || diaOffset <= 0) {
    return NextResponse.json({ erro: "Dia inválido" }, { status: 400 });
  }
  if (!tipoFollowUpId) {
    return NextResponse.json({ erro: "Selecione um tipo de follow-up" }, { status: 400 });
  }

  const tipo = await prisma.tipoFollowUp.findUnique({ where: { id: tipoFollowUpId } });
  if (!tipo || tipo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Tipo de follow-up inválido" }, { status: 400 });
  }

  const regua = await prisma.reguaFollowUp.create({
    data: { empresaId: ctx.empresaId, perfil, periodicidade, diaOffset, tipoFollowUpId },
    include: { tipoFollowUp: { select: { id: true, nome: true, canal: true } } },
  });
  return NextResponse.json({ regua }, { status: 201 });
}
