import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { carregarPropostaParaPdf } from "@/lib/propostaComercial";
import { gerarPropostaPdf } from "@/lib/pdf/propostaPdf";
import { enviarEmailComAnexo } from "@/lib/gmail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const orcamento = await prisma.orcamento.findUnique({
    where: { id },
    include: { lead: { select: { email: true } } },
  });
  if (!orcamento || orcamento.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });
  }
  if (!orcamento.lead.email) {
    return NextResponse.json({ erro: "Este lead não tem e-mail cadastrado" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: session.id } });
  if (!usuario) return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });

  const dados = await carregarPropostaParaPdf(id, ctx.empresaId);
  if (!dados) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });

  const pdf = await gerarPropostaPdf(dados);
  const resultado = await enviarEmailComAnexo(usuario, {
    para: orcamento.lead.email,
    assunto: `Proposta comercial — ${dados.empresaNome}`,
    corpo: `Olá, ${dados.lead.nome}!\n\nSegue em anexo a proposta comercial conversada.\n\nQualquer dúvida, é só responder este e-mail.\n\n${dados.empresaNome}`,
    anexoNome: `proposta-${dados.lead.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    anexoBuffer: pdf,
    anexoMimeType: "application/pdf",
  });

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 502 });
  }

  await prisma.orcamento.update({ where: { id }, data: { status: "enviado" } });
  return NextResponse.json({ ok: true });
}
