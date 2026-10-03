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
  const atualizado: ModeloProposta = {
    diagnostico: body.diagnostico ?? atual.diagnostico,
    deliverables: Array.isArray(body.deliverables) ? body.deliverables : atual.deliverables,
    garantia: body.garantia ?? atual.garantia,
    urgencia: body.urgencia ?? atual.urgencia,
    fechamento: body.fechamento ?? atual.fechamento,
    corDestaque: body.corDestaque ?? atual.corDestaque,
    validadeDias: body.validadeDias ?? atual.validadeDias,
  };
  await salvarModeloProposta(ctx.empresaId, atualizado);
  return NextResponse.json({ ok: true, modelo: atualizado });
}
