import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { iniciarBuscaApify } from "@/lib/apify";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const config = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "apify_token" } },
  });
  if (!config?.valor) {
    return NextResponse.json({ erro: "Configure o token da Apify primeiro" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const nicho = String(body?.nicho ?? "").trim();
  const localizacao = String(body?.localizacao ?? "").trim();
  const maxResultados = Number(body?.maxResultados ?? 50);
  if (!nicho || !localizacao) {
    return NextResponse.json({ erro: "Preencha nicho e localização" }, { status: 400 });
  }

  try {
    const { runId, datasetId } = await iniciarBuscaApify(config.valor, nicho, localizacao, maxResultados);
    return NextResponse.json({ runId, datasetId });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : "Erro ao iniciar busca" }, { status: 502 });
  }
}
