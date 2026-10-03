import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

const CHAVE = "apify_token";

/**
 * Token da Apify usado pra prospecção de leads (Google Maps) — guardado à
 * parte do endpoint genérico /api/configuracoes (que devolve todo valor em
 * texto puro pra qualquer usuário logado da empresa) porque é uma credencial
 * de API de terceiros com cobrança própria, não um dado de exibição como o
 * link do Meet. GET nunca devolve o valor — só se está configurado.
 */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const config = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: CHAVE } },
  });
  return NextResponse.json({ configurado: Boolean(config?.valor) });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  if (!token) return NextResponse.json({ erro: "Token obrigatório" }, { status: 400 });

  await prisma.configuracao.upsert({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: CHAVE } },
    create: { empresaId: ctx.empresaId, chave: CHAVE, valor: token },
    update: { valor: token },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  await prisma.configuracao.deleteMany({ where: { empresaId: ctx.empresaId, chave: CHAVE } });
  return NextResponse.json({ ok: true });
}
