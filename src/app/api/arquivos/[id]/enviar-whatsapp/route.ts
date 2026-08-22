import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { baixarArquivoBuffer } from "@/lib/supabaseStorage";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

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

  const provider = await getWhatsAppProvider(ctx.empresaId);
  if (!provider.enviarDocumento) {
    return NextResponse.json(
      { erro: "Envio de arquivo pelo WhatsApp requer o WhatsApp (não-oficial) conectado em Integrações." },
      { status: 409 }
    );
  }

  try {
    const buffer = await baixarArquivoBuffer(arquivo.storagePath);
    const resultado = await provider.enviarDocumento(
      lead.telefone,
      buffer.toString("base64"),
      arquivo.nome,
      arquivo.mimeType
    );
    if (resultado.status === "falhou") {
      return NextResponse.json({ erro: "Falha ao enviar pelo WhatsApp" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[arquivos/enviar-whatsapp]", err);
    return NextResponse.json({ erro: "Erro ao enviar o arquivo" }, { status: 500 });
  }
}
