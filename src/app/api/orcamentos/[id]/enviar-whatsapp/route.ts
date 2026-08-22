import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { carregarOrcamentoParaPdf } from "@/lib/orcamentos";
import { gerarOrcamentoPdf } from "@/lib/pdf/orcamentoPdf";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: { lead: { select: { telefone: true } } },
  });
  if (!orcamento || orcamento.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });
  }

  const dados = await carregarOrcamentoParaPdf(id, ctx.empresaId);
  if (!dados) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });

  const provider = await getWhatsAppProvider(ctx.empresaId);
  if (!provider.enviarDocumento) {
    return NextResponse.json(
      { erro: "Envio de arquivo pelo WhatsApp requer o WhatsApp (não-oficial) conectado em Integrações." },
      { status: 409 }
    );
  }

  const pdf = await gerarOrcamentoPdf(dados);
  const resultado = await provider.enviarDocumento(
    orcamento.lead.telefone,
    pdf.toString("base64"),
    `orcamento-${dados.lead.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    "application/pdf"
  );

  if (resultado.status === "falhou") {
    return NextResponse.json({ erro: "Falha ao enviar pelo WhatsApp" }, { status: 502 });
  }

  await prisma.orcamento.update({ where: { id }, data: { status: "enviado" } });
  return NextResponse.json({ ok: true });
}
