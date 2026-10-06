import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

/**
 * Confirma que a mensagem foi mandada manualmente (link do WhatsApp) —
 * registra na timeline do lead como enviada pelo vendedor e resolve a
 * pendência. Não dá pra confirmar entrega de verdade (saiu do nosso
 * controle assim que abre o wa.me), então é o próprio vendedor que avisa.
 */
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

  if (texto) {
    await prisma.mensagem.create({
      data: {
        leadId: pendencia.leadId,
        remetente: "vendedor",
        conteudo: texto,
        statusEntrega: "enviado",
        vendedorId: session.id,
      },
    });
  }

  await prisma.followUpReguaEnvio.update({
    where: { id },
    data: { status: "enviado", mensagemGerada: texto || pendencia.mensagemGerada },
  });
  return NextResponse.json({ ok: true });
}
