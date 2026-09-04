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

  const grupos = await prisma.grupoCliente.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { nome: "asc" },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json({ grupos });
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

  const grupo = await prisma.grupoCliente.create({
    data: {
      empresaId: ctx.empresaId,
      nome,
      descricao: body?.descricao?.trim() || null,
      cor: body?.cor || "#6B7280",
    },
  });
  return NextResponse.json({ grupo }, { status: 201 });
}
