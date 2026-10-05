import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { carregarRelatorioConversao } from "@/lib/relatorios";
import { gerarRelatorioPdf, type SecaoRelatorio } from "@/lib/pdf/relatorioPdf";

const SECOES_VALIDAS: SecaoRelatorio[] = ["conversao", "tempo", "performance", "origem"];

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const secoesPedidas = Array.isArray(body?.secoes) ? body.secoes : SECOES_VALIDAS;
  const secoes = SECOES_VALIDAS.filter((s) => secoesPedidas.includes(s));
  if (secoes.length === 0) {
    return NextResponse.json({ erro: "Selecione ao menos uma seção" }, { status: 400 });
  }

  const [empresa, relatorio] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: ctx.empresaId }, select: { nome: true, logoUrl: true } }),
    carregarRelatorioConversao(ctx.empresaId, {
      restringirAoVendedorId: session.papel === "vendedor" ? session.id : undefined,
    }),
  ]);
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 });

  const pdf = await gerarRelatorioPdf({
    ...relatorio,
    empresaNome: empresa.nome,
    empresaLogoUrl: empresa.logoUrl,
    geradoEm: new Date(),
    secoes,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="relatorio-${empresa.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
