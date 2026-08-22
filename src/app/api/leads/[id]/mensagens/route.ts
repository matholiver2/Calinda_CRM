import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { processarMensagemRecebida } from "@/lib/conversationService";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const mensagens = await prisma.mensagem.findMany({
    where: { leadId: id },
    orderBy: { enviadoEm: "asc" },
    include: { vendedor: { select: { nome: true, avatarCor: true } } },
  });
  return NextResponse.json({ mensagens });
}

/**
 * Envia uma mensagem no contexto do lead. Dois modos:
 * - remetente "lead": simula o webhook do WhatsApp recebendo uma resposta do
 *   lead (útil para demonstrar/testar o motor de automação sem WhatsApp real).
 * - remetente "vendedor": intervenção manual — pausa a IA para esse lead
 *   (handoff), conforme a tela "Conversas com IA" do descritivo técnico.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const conteudo = String(body?.conteudo ?? "").trim();
  const remetente = body?.remetente === "lead" ? "lead" : "vendedor";

  if (!conteudo) return NextResponse.json({ erro: "Mensagem vazia" }, { status: 400 });

  if (remetente === "lead") {
    const resultado = await processarMensagemRecebida(id, conteudo);
    return NextResponse.json({ ok: true, ...resultado });
  }

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
  const mensagem = await prisma.mensagem.create({
    data: {
      leadId: id,
      remetente: "vendedor",
      conteudo,
      statusEntrega: "enviado",
      vendedorId: session.papel === "super_admin" ? null : session.id,
    },
  });

  if (lead.iaAtiva) {
    await prisma.lead.update({ where: { id }, data: { iaAtiva: false } });
  }

  const provider = await getWhatsAppProvider(lead.empresaId);
  const resultadoEnvio = await provider.enviarMensagem(lead.telefone, conteudo);
  if (resultadoEnvio.status === "falhou") {
    await prisma.mensagem.update({ where: { id: mensagem.id }, data: { statusEntrega: "falhou" } });
  }

  return NextResponse.json({ ok: true, mensagem, entregue: resultadoEnvio.status === "enviado" });
}
