import { NextResponse } from "next/server";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { carregarModeloProposta, salvarModeloProposta, type ModeloProposta } from "@/lib/propostaComercial";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const modelo = await carregarModeloProposta(ctx.empresaId);
  return NextResponse.json({ modelo });
}

/** Aceita atualização parcial (merge raso com o modelo salvo) — o editor manda só a aba que foi alterada. */
export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = (await req.json().catch(() => null)) as Partial<ModeloProposta> | null;
  if (!body) return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });

  const atual = await carregarModeloProposta(ctx.empresaId);
  const atualizado: ModeloProposta = { ...atual, ...body };
  await salvarModeloProposta(ctx.empresaId, atualizado);
  return NextResponse.json({ ok: true, modelo: atualizado });
}
