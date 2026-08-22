import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { caminhoArquivo, criarUploadAssinado } from "@/lib/supabaseStorage";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const pastaId = String(body?.pastaId ?? "");
  const nomeArquivo = String(body?.nomeArquivo ?? "");
  if (!pastaId || !nomeArquivo) {
    return NextResponse.json({ erro: "pastaId e nomeArquivo são obrigatórios" }, { status: 400 });
  }

  const pasta = await prisma.pastaArquivo.findUnique({ where: { id: pastaId } });
  if (!pasta || pasta.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Pasta não encontrada" }, { status: 404 });
  }

  try {
    const path = caminhoArquivo(ctx.empresaId, pastaId, nomeArquivo);
    const { signedUrl, token } = await criarUploadAssinado(path);
    return NextResponse.json({ signedUrl, token, path });
  } catch (err) {
    console.error("[arquivos/upload-assinado]", err);
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : "Erro ao gerar upload" },
      { status: 500 }
    );
  }
}
