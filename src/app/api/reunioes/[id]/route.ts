import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { sincronizarReuniaoComGoogle } from "@/lib/googleCalendarSync";
import { enviarConviteReuniaoPorEmail } from "@/lib/reuniaoEmail";

/**
 * Atualiza uma reunião (status/resultado). Quando o resultado é "não fechou",
 * o lead é movido automaticamente para a etapa/fluxo de remarketing —
 * regra de negócio da seção 7 do descritivo técnico.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const reuniaoExistente = await prisma.reuniao.findUnique({ where: { id }, include: { lead: true } });
  if (!reuniaoExistente || reuniaoExistente.lead.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Reunião não encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  const reuniao = await prisma.reuniao.update({
    where: { id },
    data: {
      status: body?.status,
      resultado: body?.resultado,
      linkCalendario: body?.linkCalendario,
      dataHora: body?.dataHora ? new Date(body.dataHora) : undefined,
      vendedorId: body?.vendedorId,
      modalidade: body?.modalidade,
    },
    include: { lead: true },
  });
  void sincronizarReuniaoComGoogle(reuniao.id);
  // Só reenvia o convite quando essa chamada de fato tocou a modalidade —
  // evita mandar e-mail de novo em toda edição de status/resultado.
  if (body?.modalidade !== undefined) {
    void enviarConviteReuniaoPorEmail(reuniao.id);
  }

  if (body?.resultado === "nao_fechou") {
    const etapaRemarketing = await prisma.etapaFunil.findFirst({
      where: { empresaId: ctx.empresaId, tipo: "remarketing" },
    });
    if (etapaRemarketing) {
      await prisma.historicoEtapa.updateMany({
        where: { leadId: reuniao.leadId, saiuEm: null },
        data: { saiuEm: new Date() },
      });
      await prisma.historicoEtapa.create({
        data: {
          leadId: reuniao.leadId,
          etapaId: etapaRemarketing.id,
          motivoTransicao: "reuniao_nao_fechou",
          vendedorId: session.papel === "super_admin" ? null : session.id,
        },
      });
      await prisma.lead.update({
        where: { id: reuniao.leadId },
        data: { etapaAtualId: etapaRemarketing.id, status: "remarketing", iaAtiva: true },
      });
    }
  } else if (body?.resultado === "fechou") {
    await prisma.lead.update({ where: { id: reuniao.leadId }, data: { status: "cliente" } });
  }

  return NextResponse.json({ reuniao });
}
