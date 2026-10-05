import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { carregarRelatorioConversao } from "@/lib/relatorios";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  // Vendedor só vê os próprios números — gestor e admin veem de todos.
  const dados = await carregarRelatorioConversao(ctx.empresaId, {
    restringirAoVendedorId: session.papel === "vendedor" ? session.id : undefined,
  });
  return NextResponse.json(dados);
}
