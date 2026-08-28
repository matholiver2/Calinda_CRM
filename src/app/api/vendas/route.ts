import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { decimalParaNumero } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId: ctx.empresaId,
      ...(de || ate
        ? { dataPagamento: { ...(de ? { gte: new Date(de) } : {}), ...(ate ? { lte: new Date(ate) } : {}) } }
        : {}),
    },
    include: {
      lead: { select: { id: true, nome: true } },
      vendedor: { select: { id: true, nome: true, avatarCor: true } },
    },
    orderBy: { dataPagamento: "desc" },
  });

  return NextResponse.json({
    vendas: vendas.map((v) => ({
      ...v,
      valor: decimalParaNumero(v.valor),
      comissaoPercentual: v.comissaoPercentual ? decimalParaNumero(v.comissaoPercentual) : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const valor = Number(body?.valor);
  const quantidade = Number(body?.quantidade ?? 1);
  const formaPagamento = body?.formaPagamento;
  const FORMAS_VALIDAS = ["pix", "cartao", "boleto", "dinheiro", "transferencia"];

  // Rascunho: salvo quando o usuário fecha o modal sem terminar de preencher
  // (ver src/app/(app)/vendas/page.tsx) — não exige valor/forma válidos, e
  // não entra nas somas de receita do Dashboard/Relatórios até ser confirmado.
  const rascunho = Boolean(body?.rascunho);

  if (!rascunho) {
    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json({ erro: "Valor (maior que zero) é obrigatório" }, { status: 400 });
    }
    if (!FORMAS_VALIDAS.includes(formaPagamento)) {
      return NextResponse.json({ erro: "Forma de pagamento inválida" }, { status: 400 });
    }
  }

  const recorrente = Boolean(body?.recorrente);
  const comissaoIntegral = body?.comissaoIntegral !== false;

  const venda = await prisma.venda.create({
    data: {
      empresaId: ctx.empresaId,
      leadId: body?.leadId || null,
      vendedorId: body?.vendedorId || (session.papel === "vendedor" ? session.id : null),
      valor: Number.isFinite(valor) && valor > 0 ? valor : 0,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
      formaPagamento: FORMAS_VALIDAS.includes(formaPagamento) ? formaPagamento : "pix",
      recorrente,
      proximaCobrancaEm: recorrente && body?.proximaCobrancaEm ? new Date(body.proximaCobrancaEm) : null,
      comissaoIntegral,
      comissaoPercentual: !comissaoIntegral && body?.comissaoPercentual ? Number(body.comissaoPercentual) : null,
      dataPagamento: body?.dataPagamento ? new Date(body.dataPagamento) : new Date(),
      status: rascunho ? "rascunho" : "confirmada",
      comprovantePath: body?.comprovantePath || null,
    },
    include: {
      lead: { select: { id: true, nome: true } },
      vendedor: { select: { id: true, nome: true, avatarCor: true } },
    },
  });

  return NextResponse.json(
    {
      venda: {
        ...venda,
        valor: decimalParaNumero(venda.valor),
        comissaoPercentual: venda.comissaoPercentual ? decimalParaNumero(venda.comissaoPercentual) : null,
      },
    },
    { status: 201 }
  );
}
