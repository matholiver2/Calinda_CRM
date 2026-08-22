import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { enviarReengajamentoRemarketing } from "@/lib/remarketingService";
import { prisma } from "@/lib/db";

/**
 * Força um ciclo imediato de reengajamento (a mesma lógica do poller
 * automático de remarketing, ver src/lib/remarketingService.ts) pra um lead
 * específico — usado pelo botão "Reengajar agora" na tela de Remarketing.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  await prisma.lead.update({ where: { id }, data: { iaAtiva: true } });
  const mensagem = await enviarReengajamentoRemarketing(id);
  return NextResponse.json({ ok: true, mensagem });
}
