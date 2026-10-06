import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

/**
 * Marcos da régua de relacionamento que precisam de ação do vendedor: canal
 * manual (ligação/visita — a IA já escreveu a mensagem, mas o contato em si
 * não dá pra automatizar) ou canal automático cujo envio pelo WhatsApp
 * falhou. Ver src/lib/reguaFollowUpService.ts.
 */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const pendencias = await prisma.followUpReguaEnvio.findMany({
    where: { status: "pendente", lead: { empresaId: ctx.empresaId } },
    include: {
      lead: { select: { id: true, nome: true, telefone: true, status: true } },
      tipoFollowUp: { select: { id: true, nome: true, objetivo: true, canal: true } },
      regua: { select: { diaOffset: true, perfil: true, periodicidade: true } },
    },
    orderBy: { executadoEm: "desc" },
  });
  return NextResponse.json({ pendencias });
}
