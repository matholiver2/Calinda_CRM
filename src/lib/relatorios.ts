import { prisma } from "@/lib/db";

export type DadosRelatorio = {
  conversaoPorEtapa: { etapa: string; cor: string; ordem: number; alcancaram: number }[];
  tempoMedioPorEtapa: { etapa: string; cor: string; horasMedia: number }[];
  origemLeads: { origem: string; total: number; percentual: number }[];
  performancePorVendedor: {
    vendedorId: string;
    nome: string;
    avatarCor: string;
    leadsAtribuidos: number;
    reunioesRealizadas: number;
    reunioesFechadas: number;
    taxaFechamento: number;
  }[];
};

/** Mesma computação usada por /api/relatorios/conversao (JSON, tela) e pelo export em PDF — extraída pra não duplicar a lógica entre os dois. */
export async function carregarRelatorioConversao(
  empresaId: string,
  opcoes: { restringirAoVendedorId?: string } = {}
): Promise<DadosRelatorio> {
  const restringirId = opcoes.restringirAoVendedorId;

  const [etapas, leads, historico, usuarios] = await Promise.all([
    prisma.etapaFunil.findMany({ where: { empresaId, tipo: "funil" }, orderBy: { ordem: "asc" } }),
    prisma.lead.findMany({
      where: { empresaId, ...(restringirId ? { vendedorId: restringirId } : {}) },
    }),
    prisma.historicoEtapa.findMany({
      where: { lead: { empresaId, ...(restringirId ? { vendedorId: restringirId } : {}) } },
      include: { etapa: true },
    }),
    prisma.membroEmpresa.findMany({
      where: {
        empresaId,
        papel: "vendedor",
        ativo: true,
        ...(restringirId ? { usuarioId: restringirId } : {}),
      },
      include: { usuario: { select: { id: true, nome: true, avatarCor: true } } },
    }),
  ]);

  const totalLeads = leads.length || 1;

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
    usuarios.map(async (m) => {
      const u = m.usuario;
      const leadsAtribuidos = leads.filter((l) => l.vendedorId === u.id);
      const reunioes = await prisma.reuniao.findMany({
        where: { vendedorId: u.id, lead: { empresaId } },
      });
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

  return { conversaoPorEtapa, tempoMedioPorEtapa, origemLeads, performancePorVendedor };
}
