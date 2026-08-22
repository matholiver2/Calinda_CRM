import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { removerArquivos } from "@/lib/supabaseStorage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const pasta = await prisma.pastaArquivo.findUnique({ where: { id }, include: { arquivos: true } });
  if (!pasta || pasta.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Pasta não encontrada" }, { status: 404 });
  }

  await removerArquivos(pasta.arquivos.map((a) => a.storagePath));
  await prisma.pastaArquivo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
