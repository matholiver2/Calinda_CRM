import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

/** Dispensa uma pendência de follow-up sem enviar nada (ex: cliente já contatado por outro canal). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const pendencia = await prisma.followUpReguaEnvio.findUnique({
    where: { id },
    include: { lead: { select: { empresaId: true } } },
  });
  if (!pendencia || pendencia.lead.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Pendência não encontrada" }, { status: 404 });
  }

  await prisma.followUpReguaEnvio.update({ where: { id }, data: { status: "descartado" } });
  return NextResponse.json({ ok: true });
}
