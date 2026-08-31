import { NextResponse } from "next/server";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { carregarHistoricoAssistente } from "@/lib/assistenteHistorico";

/** Histórico do chat Assistente (últimos 30 dias) pro usuário logado, na empresa ativa. */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const historico = await carregarHistoricoAssistente(session.id, ctx.empresaId);
  return NextResponse.json({ historico });
}
