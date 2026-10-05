import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { construirPropostaExemplo, MODELO_PROPOSTA_PADRAO, type ModeloProposta } from "@/lib/propostaComercial";
import { gerarPropostaPdf } from "@/lib/pdf/propostaPdf";

/**
 * Gera o PDF de exemplo a partir do modelo ainda em edição (não salvo) —
 * usado pelo botão "Prévia" em ModeloPropostaDialog. O corpo da requisição é
 * o ModeloProposta completo tal como está no formulário nesse momento.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = (await req.json().catch(() => null)) as Partial<ModeloProposta> | null;
  if (!body) return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });

  const modelo: ModeloProposta = { ...MODELO_PROPOSTA_PADRAO, ...body };
  const dados = await construirPropostaExemplo(ctx.empresaId, modelo);
  if (!dados) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 });

  const pdf = await gerarPropostaPdf(dados);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="previa-proposta.pdf"`,
    },
  });
}
