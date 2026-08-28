import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { decimalParaNumero } from "@/lib/utils";

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const agora = new Date();
  const inicioJanela = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);

  // Vendedor só vê as próprias vendas — gestor e admin veem de todos.
  const restringirAoVendedor = session.papel === "vendedor";

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId: ctx.empresaId,
      dataPagamento: { gte: inicioJanela },
      status: "confirmada",
      ...(restringirAoVendedor ? { vendedorId: session.id } : {}),
    },
    include: { lead: { select: { nome: true } } },
    orderBy: { dataPagamento: "desc" },
  });

  const valores = vendas.map((v) => ({ ...v, valorNum: decimalParaNumero(v.valor) }));

  const totalMesAtual = valores
    .filter(
      (v) => v.dataPagamento.getFullYear() === agora.getFullYear() && v.dataPagamento.getMonth() === agora.getMonth()
    )
    .reduce((s, v) => s + v.valorNum, 0);

  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const receitaSemana = valores.filter((v) => v.dataPagamento >= seteDiasAtras).reduce((s, v) => s + v.valorNum, 0);

  const receitaPorMes: { mes: string; valor: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const total = valores
      .filter((v) => v.dataPagamento.getFullYear() === d.getFullYear() && v.dataPagamento.getMonth() === d.getMonth())
      .reduce((s, v) => s + v.valorNum, 0);
    receitaPorMes.push({ mes: MESES[d.getMonth()], valor: total });
  }

  const saldoTrend: number[] = [];
  for (let i = 9; i >= 0; i--) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
    const proximoDia = new Date(dia.getTime() + 24 * 60 * 60 * 1000);
    const total = valores
      .filter((v) => v.dataPagamento >= dia && v.dataPagamento < proximoDia)
      .reduce((s, v) => s + v.valorNum, 0);
    saldoTrend.push(total);
  }

  const ultimasVendas = valores.slice(0, 6).map((v) => ({
    id: v.id,
    nome: v.lead?.nome ?? "Cliente avulso",
    data: v.dataPagamento,
    valor: v.valorNum,
    formaPagamento: v.formaPagamento,
    recorrente: v.recorrente,
  }));

  const comissaoMes = valores
    .filter(
      (v) => v.dataPagamento.getFullYear() === agora.getFullYear() && v.dataPagamento.getMonth() === agora.getMonth()
    )
    .reduce((s, v) => s + (v.comissaoIntegral ? v.valorNum : (v.valorNum * decimalParaNumero(v.comissaoPercentual ?? 0)) / 100), 0);

  const recorrentesAtivas = valores.filter((v) => v.recorrente).slice(0, 8);

  return NextResponse.json({
    totalMesAtual,
    receitaSemana,
    receitaPorMes,
    saldoTrend,
    ultimasVendas,
    comissaoMes,
    recorrentes: {
      total: recorrentesAtivas.length,
      nomes: recorrentesAtivas.map((v) => v.lead?.nome ?? "Cliente avulso"),
    },
  });
}
