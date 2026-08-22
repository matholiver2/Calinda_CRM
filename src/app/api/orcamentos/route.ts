import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { decimalParaNumero } from "@/lib/utils";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const orcamentos = await prisma.orcamento.findMany({
    where: { empresaId: ctx.empresaId },
    include: {
      lead: { select: { id: true, nome: true, telefone: true, email: true } },
      plano: { select: { id: true, nome: true, periodicidade: true } },
      criadoPor: { select: { id: true, nome: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json({
    orcamentos: orcamentos.map((o) => ({ ...o, valor: decimalParaNumero(o.valor) })),
  });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const leadId = String(body?.leadId ?? "");
  const valor = Number(body?.valor);
  if (!leadId || !Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ erro: "Cliente e valor (maior que zero) são obrigatórios" }, { status: 400 });
  }
  if (!(await leadPertenceAEmpresa(leadId, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const planoId = body?.planoId || null;
  if (planoId) {
    const plano = await prisma.plano.findUnique({ where: { id: planoId } });
    if (!plano || plano.empresaId !== ctx.empresaId) {
      return NextResponse.json({ erro: "Plano não encontrado" }, { status: 404 });
    }
  }

  const orcamento = await prisma.orcamento.create({
    data: {
      empresaId: ctx.empresaId,
      leadId,
      planoId,
      valor,
      observacoes: body?.observacoes || null,
      criadoPorId: session.papel === "super_admin" ? null : session.id,
    },
    include: {
      lead: { select: { id: true, nome: true, telefone: true, email: true } },
      plano: { select: { id: true, nome: true, periodicidade: true } },
      criadoPor: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(
    { orcamento: { ...orcamento, valor: decimalParaNumero(orcamento.valor) } },
    { status: 201 }
  );
}
