import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";

/**
 * Pasta de arquivos "do cliente", criada automaticamente na primeira vez
 * que a tela do Lead pede os arquivos dele (find-or-create) — reaproveita
 * a mesma estrutura da página Arquivos (PastaArquivo/Arquivo), só que
 * vinculada ao lead em vez de solta.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  let pasta = await prisma.pastaArquivo.findUnique({ where: { leadId: id } });
  if (!pasta) {
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { nome: true } });
    pasta = await prisma.pastaArquivo.create({
      data: { empresaId: ctx.empresaId, leadId: id, nome: lead.nome },
    });
  }

  const arquivos = await prisma.arquivo.findMany({ where: { pastaId: pasta.id }, orderBy: { criadoEm: "desc" } });
  return NextResponse.json({ pastaId: pasta.id, arquivos });
}
