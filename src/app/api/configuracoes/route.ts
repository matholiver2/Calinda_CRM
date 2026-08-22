import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const configuracoes = await prisma.configuracao.findMany({ where: { empresaId: ctx.empresaId } });
  return NextResponse.json({
    configuracoes: Object.fromEntries(configuracoes.map((c) => [c.chave, c.valor])),
  });
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const chave = String(body?.chave ?? "");
  const valor = String(body?.valor ?? "");
  if (!chave) return NextResponse.json({ erro: "Chave obrigatória" }, { status: 400 });

  await prisma.configuracao.upsert({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave } },
    create: { empresaId: ctx.empresaId, chave, valor },
    update: { valor },
  });
  return NextResponse.json({ ok: true });
}
