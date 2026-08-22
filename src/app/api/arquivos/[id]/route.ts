import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { criarDownloadAssinado, removerArquivos } from "@/lib/supabaseStorage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const arquivo = await prisma.arquivo.findUnique({ where: { id } });
  if (!arquivo || arquivo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });
  }

  try {
    const url = await criarDownloadAssinado(arquivo.storagePath, arquivo.nome);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[arquivos/[id] GET]", err);
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : "Erro ao gerar link de download" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const arquivo = await prisma.arquivo.findUnique({ where: { id } });
  if (!arquivo || arquivo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });
  }

  await removerArquivos([arquivo.storagePath]);
  await prisma.arquivo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
