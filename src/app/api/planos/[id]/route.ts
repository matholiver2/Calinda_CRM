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

async function pertenceAEmpresa(planoId: string, empresaId: string) {
  const plano = await prisma.plano.findUnique({ where: { id: planoId } });
  return plano && plano.empresaId === empresaId ? plano : null;
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
    return NextResponse.json({ erro: "Plano não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const plano = await prisma.plano.update({
    where: { id },
    data: {
      nome: body?.nome,
      descricao: body?.descricao,
      valor: body?.valor !== undefined ? Number(body.valor) : undefined,
      periodicidade: body?.periodicidade,
      ativo: body?.ativo,
    },
  });
  return NextResponse.json({ plano: { ...plano, valor: decimalParaNumero(plano.valor) } });
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
    return NextResponse.json({ erro: "Plano não encontrado" }, { status: 404 });
  }

  const orcamentosVinculados = await prisma.orcamento.count({ where: { planoId: id } });
  if (orcamentosVinculados > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir um plano com orçamentos vinculados. Desative-o em vez de excluir." },
      { status: 409 }
    );
  }

  await prisma.plano.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
