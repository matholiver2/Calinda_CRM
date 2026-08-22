import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { carregarOrcamentoParaPdf } from "@/lib/orcamentos";
import { gerarOrcamentoPdf } from "@/lib/pdf/orcamentoPdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const dados = await carregarOrcamentoParaPdf(id, ctx.empresaId);
  if (!dados) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });

  const pdf = await gerarOrcamentoPdf(dados);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="orcamento-${dados.lead.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
