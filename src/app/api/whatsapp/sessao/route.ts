import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

/**
 * Status da conexão WhatsApp (Baileys/whatsapp-worker) da empresa ativa.
 * Só lê do banco — a tela de Integrações faz polling aqui, não no worker
 * diretamente, para não depender da disponibilidade do worker a cada render.
 */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const sessao = await prisma.whatsappSessao.findUnique({ where: { empresaId: ctx.empresaId } });

  return NextResponse.json({
    status: sessao?.status ?? "desconectado",
    numeroConectado: sessao?.numeroConectado ?? null,
  });
}
