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

async function pertenceAEmpresa(vendaId: string, empresaId: string) {
  const venda = await prisma.venda.findUnique({ where: { id: vendaId } });
  return venda && venda.empresaId === empresaId ? venda : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await pertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Venda não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const venda = await prisma.venda.update({
    where: { id },
    data: {
      valor: body?.valor !== undefined ? Number(body.valor) : undefined,
      quantidade: body?.quantidade !== undefined ? Number(body.quantidade) : undefined,
      formaPagamento: body?.formaPagamento,
      recorrente: body?.recorrente,
      proximaCobrancaEm: body?.proximaCobrancaEm ? new Date(body.proximaCobrancaEm) : undefined,
      comissaoIntegral: body?.comissaoIntegral,
      comissaoPercentual: body?.comissaoPercentual !== undefined ? Number(body.comissaoPercentual) : undefined,
    },
  });
  return NextResponse.json({
    venda: {
      ...venda,
      valor: decimalParaNumero(venda.valor),
      comissaoPercentual: venda.comissaoPercentual ? decimalParaNumero(venda.comissaoPercentual) : null,
    },
  });
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
    return NextResponse.json({ erro: "Venda não encontrada" }, { status: 404 });
  }

  await prisma.venda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
