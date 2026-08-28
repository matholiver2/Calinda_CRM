import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const novaEtapaId = String(body?.etapaId ?? "");
  if (!novaEtapaId) return NextResponse.json({ erro: "etapaId é obrigatório" }, { status: 400 });

  const [lead, novaEtapa] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id } }),
    prisma.etapaFunil.findUniqueOrThrow({ where: { id: novaEtapaId } }),
  ]);

  if (novaEtapa.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Etapa inválida" }, { status: 400 });
  }

  if (lead.etapaAtualId === novaEtapaId) {
    return NextResponse.json({ lead });
  }

  await prisma.historicoEtapa.updateMany({
    where: { leadId: id, saiuEm: null },
    data: { saiuEm: new Date() },
  });
  await prisma.historicoEtapa.create({
    data: {
      leadId: id,
      etapaId: novaEtapaId,
      motivoTransicao: "manual_vendedor",
      vendedorId: session.id,
    },
  });

  // Mover manualmente pra uma etapa de remarketing/cliente precisa refletir
  // no status do lead também — senão a página de Remarketing (que filtra por
  // status, não por etapa) nunca mostra o lead que acabou de entrar lá.
  const statusFinal =
    novaEtapa.tipo === "remarketing" ? "remarketing" : novaEtapa.tipo === "cliente" ? "cliente" : "ativo";

  const leadAtualizado = await prisma.lead.update({
    where: { id },
    data: {
      etapaAtualId: novaEtapaId,
      status: statusFinal,
      iaAtiva: novaEtapa.handoffHumano ? false : lead.iaAtiva,
      vendedorId:
        novaEtapa.handoffHumano && !lead.vendedorId && session.papel !== "super_admin"
          ? session.id
          : lead.vendedorId,
    },
    include: { etapaAtual: true, vendedor: true },
  });

  return NextResponse.json({ lead: leadAtualizado });
}
