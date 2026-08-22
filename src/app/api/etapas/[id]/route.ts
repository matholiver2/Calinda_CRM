import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

async function pertenceAEmpresa(etapaId: string, empresaId: string) {
  const etapa = await prisma.etapaFunil.findUnique({ where: { id: etapaId } });
  return etapa && etapa.empresaId === empresaId ? etapa : null;
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
    return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const etapa = await prisma.etapaFunil.update({
    where: { id },
    data: {
      nome: body?.nome,
      ordem: body?.ordem,
      cor: body?.cor,
      tipo: body?.tipo,
      promptIa: body?.promptIa,
      descricaoObjetivo: body?.descricaoObjetivo,
      handoffHumano: body?.handoffHumano,
    },
  });
  return NextResponse.json({ etapa });
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
    return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });
  }

  const leadsNaEtapa = await prisma.lead.count({ where: { etapaAtualId: id } });
  if (leadsNaEtapa > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir uma etapa com leads ativos nela." },
      { status: 409 }
    );
  }

  const [historicoNaEtapa, agentesNaEtapa] = await Promise.all([
    prisma.historicoEtapa.count({ where: { etapaId: id } }),
    prisma.agenteIa.count({ where: { etapaId: id } }),
  ]);
  if (historicoNaEtapa > 0) {
    return NextResponse.json(
      {
        erro:
          "Não é possível excluir esta etapa: existem leads que já passaram por ela (histórico). Remova-os ou mantenha a etapa.",
      },
      { status: 409 }
    );
  }
  if (agentesNaEtapa > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir uma etapa com agente(s) de IA vinculados a ela." },
      { status: 409 }
    );
  }

  await prisma.etapaFunil.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
