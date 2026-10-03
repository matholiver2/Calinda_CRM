import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { montarDescricaoFollowUp } from "@/lib/reuniaoDescricao";

/** Gera título+descrição sugeridos pra um evento de follow-up/renovação com esse lead (ver NovaReuniaoDialog). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  if (!(await leadPertenceAEmpresa(id, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const sugestao = await montarDescricaoFollowUp(id);
  return NextResponse.json({ sugestao });
}
