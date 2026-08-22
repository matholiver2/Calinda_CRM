import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { marcarOnboarding } from "@/lib/onboarding";
import type { EtapaProposta, AgenteProposto } from "@/lib/ai/onboardingEngine";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const etapasPropostas = (body?.etapas ?? []) as EtapaProposta[];
  const agentesPropostos = (body?.agentes ?? []) as AgenteProposto[];

  if (etapasPropostas.length === 0) {
    return NextResponse.json({ erro: "Nenhuma etapa na proposta" }, { status: 400 });
  }

  const etapasExistentes = await prisma.etapaFunil.findMany({ where: { empresaId: ctx.empresaId } });
  const idPorNome = new Map(etapasExistentes.map((e) => [e.nome.trim().toLowerCase(), e.id]));

  for (const etapa of etapasPropostas) {
    const chave = etapa.nome.trim().toLowerCase();
    if (idPorNome.has(chave)) continue;
    const criada = await prisma.etapaFunil.create({
      data: {
        empresaId: ctx.empresaId,
        nome: etapa.nome,
        ordem: etapa.ordem,
        cor: etapa.cor || "#6B7280",
        tipo: "funil",
        descricaoObjetivo: etapa.descricaoObjetivo || null,
      },
    });
    idPorNome.set(chave, criada.id);
  }

  let criados = 0;
  for (const agente of agentesPropostos) {
    const etapaId = idPorNome.get(agente.etapaNome.trim().toLowerCase());
    if (!etapaId) continue; // etapa referenciada não bateu com nenhuma criada/existente — ignora
    await prisma.agenteIa.create({
      data: {
        empresaId: ctx.empresaId,
        nome: agente.nome,
        persona: agente.persona,
        objetivo: agente.objetivo,
        etapaId,
      },
    });
    criados++;
  }

  await marcarOnboarding(ctx.empresaId, "concluido");

  return NextResponse.json({ ok: true, etapasCriadas: idPorNome.size, agentesCriados: criados });
}
