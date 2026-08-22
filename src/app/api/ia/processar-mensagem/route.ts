import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { processarMensagemRecebida } from "@/lib/conversationService";

/**
 * Aciona o motor de IA para um lead específico (uso interno — seção 4.3).
 * Exposto separadamente do webhook do WhatsApp para permitir reprocessar
 * uma mensagem manualmente a partir do painel "Conversas com IA".
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const leadId = String(body?.leadId ?? "");
  const texto = String(body?.texto ?? "").trim();
  if (!leadId || !texto) {
    return NextResponse.json({ erro: "leadId e texto são obrigatórios" }, { status: 400 });
  }
  if (!(await leadPertenceAEmpresa(leadId, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const resultado = await processarMensagemRecebida(leadId, texto);
  return NextResponse.json({ ok: true, ...resultado });
}
