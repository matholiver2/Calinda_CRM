import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

/** Cancela um follow-up manual ainda pendente (não mexe nos já enviados/falhos). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const followUp = await prisma.followUpAgendado.findUnique({ where: { id } });
  if (!followUp || followUp.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Follow-up não encontrado" }, { status: 404 });
  }
  if (followUp.status !== "pendente") {
    return NextResponse.json({ erro: "Esse follow-up já não está mais pendente" }, { status: 400 });
  }

  const atualizado = await prisma.followUpAgendado.update({
    where: { id },
    data: { status: "cancelado" },
  });
  return NextResponse.json({ followUp: atualizado });
}
