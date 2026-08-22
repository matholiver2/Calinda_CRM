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

  const etapas = await prisma.etapaFunil.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { ordem: "asc" },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json({ etapas });
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
  if (!nome) return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });

  const maiorOrdem = await prisma.etapaFunil.aggregate({
    where: { empresaId: ctx.empresaId },
    _max: { ordem: true },
  });
  const etapa = await prisma.etapaFunil.create({
    data: {
      empresaId: ctx.empresaId,
      nome,
      ordem: body?.ordem ?? (maiorOrdem._max.ordem ?? 0) + 1,
      cor: body?.cor ?? "#6B7280",
      tipo: body?.tipo ?? "funil",
      promptIa: body?.promptIa ?? null,
      descricaoObjetivo: body?.descricaoObjetivo ?? null,
      handoffHumano: Boolean(body?.handoffHumano ?? false),
    },
  });
  return NextResponse.json({ etapa }, { status: 201 });
}
