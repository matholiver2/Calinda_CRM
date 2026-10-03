import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { consultarRunApify, buscarResultadosApify } from "@/lib/apify";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");
  if (!runId) return NextResponse.json({ erro: "runId é obrigatório" }, { status: 400 });

  const config = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "apify_token" } },
  });
  if (!config?.valor) return NextResponse.json({ erro: "Token da Apify não configurado" }, { status: 400 });

  try {
    const { status, datasetId } = await consultarRunApify(config.valor, runId);
    if (status !== "SUCCEEDED") {
      return NextResponse.json({ status, leads: null });
    }

    const avaliacaoMinima = Number(searchParams.get("avaliacaoMinima") ?? 0) || undefined;
    const avaliacoesMinimas = Number(searchParams.get("avaliacoesMinimas") ?? 0) || undefined;
    const leads = await buscarResultadosApify(config.valor, datasetId, {
      avaliacaoMinima,
      avaliacoesMinimas,
      somenteComTelefone: searchParams.get("somenteComTelefone") === "1",
      somenteComSite: searchParams.get("somenteComSite") === "1",
      somenteSemSite: searchParams.get("somenteSemSite") === "1",
    });
    return NextResponse.json({ status, leads });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : "Erro ao consultar busca" }, { status: 502 });
  }
}
