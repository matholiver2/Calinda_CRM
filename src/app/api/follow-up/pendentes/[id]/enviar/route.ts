import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { enviarEAtualizarStatus } from "@/lib/conversationService";

/** Envia a mensagem gerada pela IA pro cliente via WhatsApp (sistema) e resolve a pendência. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const pendencia = await prisma.followUpReguaEnvio.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!pendencia || pendencia.lead.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Pendência não encontrada" }, { status: 404 });
  }
  if (pendencia.status !== "pendente") {
    return NextResponse.json({ erro: "Essa pendência já foi resolvida" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const texto = (typeof body?.texto === "string" && body.texto.trim()) || pendencia.mensagemGerada || "";
  if (!texto) return NextResponse.json({ erro: "Mensagem vazia" }, { status: 400 });

  const mensagem = await prisma.mensagem.create({
    data: { leadId: pendencia.leadId, remetente: "ia", conteudo: texto, statusEntrega: "enviado" },
  });
  const resultado = await enviarEAtualizarStatus(mensagem.id, ctx.empresaId, pendencia.lead.telefone, texto);

  if (resultado.status === "falhou") {
    await prisma.followUpReguaEnvio.update({
      where: { id },
      data: { mensagemGerada: texto },
    });
    return NextResponse.json({ erro: "Não foi possível enviar pelo WhatsApp. Tente o link manual." }, { status: 502 });
  }

  await prisma.followUpReguaEnvio.update({
    where: { id },
    data: { status: "enviado", mensagemGerada: texto },
  });
  return NextResponse.json({ ok: true });
}
