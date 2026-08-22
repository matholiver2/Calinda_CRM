import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { decimalParaNumero } from "@/lib/utils";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const planos = await prisma.plano.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json({
    planos: planos.map((p) => ({ ...p, valor: decimalParaNumero(p.valor) })),
  });
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
  const valor = Number(body?.valor);
  if (!nome || !Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ erro: "Nome e valor (maior que zero) são obrigatórios" }, { status: 400 });
  }

  const plano = await prisma.plano.create({
    data: {
      empresaId: ctx.empresaId,
      nome,
      descricao: body?.descricao || null,
      valor,
      periodicidade: body?.periodicidade ?? "mensal",
    },
  });
  return NextResponse.json({ plano: { ...plano, valor: decimalParaNumero(plano.valor) } }, { status: 201 });
}
