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
  const venda = await pertenceAEmpresa(id, ctx.empresaId);
  if (!venda) {
    return NextResponse.json({ erro: "Venda não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const rascunho = Boolean(body?.rascunho);
  const FORMAS_VALIDAS = ["pix", "cartao", "boleto", "dinheiro", "transferencia"];

  if (!rascunho) {
    const valorFinal = body?.valor !== undefined ? Number(body.valor) : decimalParaNumero(venda.valor);
    const formaFinal = body?.formaPagamento ?? venda.formaPagamento;
    if (!Number.isFinite(valorFinal) || valorFinal <= 0) {
      return NextResponse.json({ erro: "Valor (maior que zero) é obrigatório" }, { status: 400 });
    }
    if (!FORMAS_VALIDAS.includes(formaFinal)) {
      return NextResponse.json({ erro: "Forma de pagamento inválida" }, { status: 400 });
    }
  }

  const vendaAtualizada = await prisma.venda.update({
    where: { id },
    data: {
      leadId: body?.leadId !== undefined ? body.leadId || null : undefined,
      valor: body?.valor !== undefined ? Number(body.valor) : undefined,
      quantidade: body?.quantidade !== undefined ? Number(body.quantidade) : undefined,
      formaPagamento: body?.formaPagamento,
      recorrente: body?.recorrente,
      proximaCobrancaEm: body?.proximaCobrancaEm ? new Date(body.proximaCobrancaEm) : undefined,
      comissaoIntegral: body?.comissaoIntegral,
      comissaoPercentual: body?.comissaoPercentual !== undefined ? Number(body.comissaoPercentual) : undefined,
      comprovantePath: body?.comprovantePath !== undefined ? body.comprovantePath || null : undefined,
      status: rascunho ? "rascunho" : "confirmada",
    },
    include: {
      lead: { select: { id: true, nome: true } },
      vendedor: { select: { id: true, nome: true, avatarCor: true } },
    },
  });
  return NextResponse.json({
    venda: {
      ...vendaAtualizada,
      valor: decimalParaNumero(vendaAtualizada.valor),
      comissaoPercentual: vendaAtualizada.comissaoPercentual ? decimalParaNumero(vendaAtualizada.comissaoPercentual) : null,
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
