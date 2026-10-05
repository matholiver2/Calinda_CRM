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

  const tipos = await prisma.tipoFollowUp.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json({ tipos });
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
  const scriptModelo = String(body?.scriptModelo ?? "").trim();
  if (!nome || !scriptModelo) {
    return NextResponse.json({ erro: "Nome e script/modelo são obrigatórios" }, { status: 400 });
  }

  const tipo = await prisma.tipoFollowUp.create({
    data: {
      empresaId: ctx.empresaId,
      nome,
      objetivo: body?.objetivo || null,
      canal: body?.canal === "manual" ? "manual" : "automatico",
      scriptModelo,
      modoEnvio: body?.modoEnvio === "ia" ? "ia" : "literal",
      ativo: body?.ativo !== false,
    },
  });
  return NextResponse.json({ tipo }, { status: 201 });
}
