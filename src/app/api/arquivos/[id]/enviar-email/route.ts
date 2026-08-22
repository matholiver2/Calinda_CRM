import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { baixarArquivoBuffer } from "@/lib/supabaseStorage";
import { enviarEmailComAnexo } from "@/lib/gmail";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const arquivo = await prisma.arquivo.findUnique({ where: { id } });
  if (!arquivo || arquivo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const leadId = String(body?.leadId ?? "");
  const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;
  if (!lead || lead.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }
  if (!lead.email) {
    return NextResponse.json({ erro: "Este cliente não tem e-mail cadastrado" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: session.id } });
  if (!usuario) return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });

  try {
    const buffer = await baixarArquivoBuffer(arquivo.storagePath);
    const resultado = await enviarEmailComAnexo(usuario, {
      para: lead.email,
      assunto: arquivo.nome,
      corpo: `Olá, ${lead.nome}!\n\nSegue em anexo o arquivo solicitado.\n\nQualquer dúvida, é só responder este e-mail.`,
      anexoNome: arquivo.nome,
      anexoBuffer: buffer,
      anexoMimeType: arquivo.mimeType,
    });
    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.erro }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[arquivos/enviar-email]", err);
    return NextResponse.json({ erro: "Erro ao enviar o arquivo" }, { status: 500 });
  }
}
