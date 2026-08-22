import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      etapaAtual: true,
      vendedor: true,
      historico: { include: { etapa: true }, orderBy: { entrouEm: "asc" } },
      mensagens: true,
      reunioes: true,
    },
  });
  if (!lead) return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });

  const tempoPorEtapa = lead.historico.map((h) => {
    const fim = h.saiuEm ? new Date(h.saiuEm).getTime() : Date.now();
    const inicio = new Date(h.entrouEm).getTime();
    return {
      etapa: h.etapa.nome,
      cor: h.etapa.cor,
      horas: Math.max(0, Math.round(((fim - inicio) / (1000 * 60 * 60)) * 10) / 10),
      motivoTransicao: h.motivoTransicao,
    };
  });

  return NextResponse.json({
    lead: {
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      status: lead.status,
      etapaAtual: lead.etapaAtual,
      vendedor: lead.vendedor,
      totalMensagens: lead.mensagens.length,
      totalReunioes: lead.reunioes.length,
    },
    tempoPorEtapa,
  });
}
