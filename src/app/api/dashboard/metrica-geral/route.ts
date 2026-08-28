import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  // Vendedor só vê os próprios leads/vendas — gestor e admin veem de todos.
  const restringirAoVendedor = session.papel === "vendedor";

  const [etapas, leads, config] = await Promise.all([
    prisma.etapaFunil.findMany({ where: { empresaId: ctx.empresaId }, orderBy: { ordem: "asc" } }),
    prisma.lead.findMany({
      where: { empresaId: ctx.empresaId, ...(restringirAoVendedor ? { vendedorId: session.id } : {}) },
      include: { etapaAtual: true, vendedor: { select: { nome: true } } },
    }),
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "leads_parados_dias" } },
    }),
  ]);

  const diasLimite = Number(config?.valor ?? 3);
  const agora = Date.now();

  const porEtapa = etapas
    .filter((e) => e.tipo === "funil")
    .map((e) => ({
      etapaId: e.id,
      nome: e.nome,
      cor: e.cor,
      ordem: e.ordem,
      total: leads.filter((l) => l.etapaAtualId === e.id).length,
    }));

  const totalLeads = leads.length;
  const leadsAtivos = leads.filter((l) => l.status === "ativo").length;
  const leadsCliente = leads.filter((l) => l.status === "cliente").length;
  const leadsPerdidos = leads.filter((l) => l.status === "perdido").length;
  const leadsRemarketing = leads.filter((l) => l.status === "remarketing").length;

  const etapaFinal = etapas.filter((e) => e.tipo === "funil").sort((a, b) => b.ordem - a.ordem)[0];
  const leadsNaEtapaFinal = etapaFinal ? leads.filter((l) => l.etapaAtualId === etapaFinal.id).length : 0;
  const taxaConversaoGeral = totalLeads > 0 ? Math.round((leadsNaEtapaFinal / totalLeads) * 1000) / 10 : 0;

  const leadsParados = leads
    .filter((l) => l.status === "ativo")
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      etapa: l.etapaAtual.nome,
      cor: l.etapaAtual.cor,
      dias: Math.floor((agora - new Date(l.atualizadoEm).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((l) => l.dias >= diasLimite)
    .sort((a, b) => b.dias - a.dias);

  const reunioesProximas = await prisma.reuniao.findMany({
    where: {
      lead: { empresaId: ctx.empresaId },
      status: { in: ["agendada", "confirmada"] },
      dataHora: { gte: new Date() },
      ...(restringirAoVendedor ? { vendedorId: session.id } : {}),
    },
    orderBy: { dataHora: "asc" },
    take: 6,
    include: { lead: { select: { nome: true } }, vendedor: { select: { nome: true } } },
  });

  const leadsRecentes = [...leads]
    .sort((a, b) => new Date(b.entrouEm).getTime() - new Date(a.entrouEm).getTime())
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      origem: l.origem,
      etapa: l.etapaAtual.nome,
      cor: l.etapaAtual.cor,
      entrouEm: l.entrouEm,
      vendedor: l.vendedor?.nome ?? null,
    }));

  return NextResponse.json({
    totalLeads,
    leadsAtivos,
    leadsCliente,
    leadsPerdidos,
    leadsRemarketing,
    taxaConversaoGeral,
    porEtapa,
    leadsParados,
    diasLimiteParado: diasLimite,
    reunioesProximas: reunioesProximas.map((r) => ({
      id: r.id,
      leadNome: r.lead.nome,
      dataHora: r.dataHora,
      vendedorNome: r.vendedor?.nome ?? "Não atribuído",
      status: r.status,
    })),
    leadsRecentes,
  });
}
