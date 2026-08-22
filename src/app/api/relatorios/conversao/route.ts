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

  const [etapas, leads, historico, usuarios] = await Promise.all([
    prisma.etapaFunil.findMany({ where: { empresaId: ctx.empresaId, tipo: "funil" }, orderBy: { ordem: "asc" } }),
    prisma.lead.findMany({ where: { empresaId: ctx.empresaId } }),
    prisma.historicoEtapa.findMany({ where: { lead: { empresaId: ctx.empresaId } }, include: { etapa: true } }),
    prisma.usuario.findMany({ where: { empresaId: ctx.empresaId, papel: "vendedor" } }),
  ]);

  const totalLeads = leads.length || 1;

  // "Alcançaram" = quantidade de leads que tiveram ao menos uma passagem
  // pelo histórico com ordem >= a da etapa (progrediram até lá ou além).
  const leadsPorEtapaAlcancada = new Map<string, Set<string>>();
  for (const h of historico) {
    if (h.etapa.tipo !== "funil") continue;
    for (const e of etapas) {
      if (h.etapa.ordem >= e.ordem) {
        const set = leadsPorEtapaAlcancada.get(e.id) ?? new Set<string>();
        set.add(h.leadId);
        leadsPorEtapaAlcancada.set(e.id, set);
      }
    }
  }
  const conversaoPorEtapa = etapas.map((e) => ({
    etapa: e.nome,
    cor: e.cor,
    ordem: e.ordem,
    alcancaram: leadsPorEtapaAlcancada.get(e.id)?.size ?? 0,
  }));

  // tempo médio (em horas) por etapa, calculado a partir do histórico
  const temposPorEtapa = new Map<string, number[]>();
  for (const h of historico) {
    if (!h.saiuEm) continue;
    const horas = (new Date(h.saiuEm).getTime() - new Date(h.entrouEm).getTime()) / (1000 * 60 * 60);
    const lista = temposPorEtapa.get(h.etapa.nome) ?? [];
    lista.push(horas);
    temposPorEtapa.set(h.etapa.nome, lista);
  }
  const tempoMedioPorEtapa = etapas.map((e) => {
    const lista = temposPorEtapa.get(e.nome) ?? [];
    const media = lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : 0;
    return { etapa: e.nome, cor: e.cor, horasMedia: Math.round(media * 10) / 10 };
  });

  const origemMap = new Map<string, number>();
  for (const l of leads) origemMap.set(l.origem, (origemMap.get(l.origem) ?? 0) + 1);
  const origemLeads = Array.from(origemMap.entries()).map(([origem, total]) => ({
    origem,
    total,
    percentual: Math.round((total / totalLeads) * 1000) / 10,
  }));

  const performancePorVendedor = await Promise.all(
    usuarios.map(async (u) => {
      const leadsAtribuidos = leads.filter((l) => l.vendedorId === u.id);
      const reunioes = await prisma.reuniao.findMany({ where: { vendedorId: u.id } });
      const fechadas = reunioes.filter((r) => r.resultado === "fechou").length;
      return {
        vendedorId: u.id,
        nome: u.nome,
        avatarCor: u.avatarCor,
        leadsAtribuidos: leadsAtribuidos.length,
        reunioesRealizadas: reunioes.filter((r) => r.status === "realizada").length,
        reunioesFechadas: fechadas,
        taxaFechamento: reunioes.length ? Math.round((fechadas / reunioes.length) * 1000) / 10 : 0,
      };
    })
  );

  return NextResponse.json({ conversaoPorEtapa, tempoMedioPorEtapa, origemLeads, performancePorVendedor });
}
