import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { carregarPropostaParaPdf } from "@/lib/propostaComercial";
import { gerarPropostaPdf } from "@/lib/pdf/propostaPdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const dados = await carregarPropostaParaPdf(id, ctx.empresaId);
  if (!dados) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });

  const pdf = await gerarPropostaPdf(dados);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="proposta-${dados.lead.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
