import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { criarDownloadAssinado } from "@/lib/supabaseStorage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const venda = await prisma.venda.findUnique({ where: { id } });
  if (!venda || venda.empresaId !== ctx.empresaId || !venda.comprovantePath) {
    return NextResponse.json({ erro: "Comprovante não encontrado" }, { status: 404 });
  }

  try {
    const signedUrl = await criarDownloadAssinado(venda.comprovantePath, "comprovante");
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("[vendas/comprovante]", err);
    return NextResponse.json({ erro: err instanceof Error ? err.message : "Erro ao gerar link" }, { status: 500 });
  }
}
