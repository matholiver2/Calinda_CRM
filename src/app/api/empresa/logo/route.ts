import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

const TAMANHO_MAX_BYTES = 2 * 1024 * 1024; // 2MB em base64

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const logoUrl = body?.logoUrl;

  if (typeof logoUrl !== "string" || !logoUrl.startsWith("data:image/")) {
    return NextResponse.json({ erro: "Imagem inválida" }, { status: 400 });
  }
  if (logoUrl.length > TAMANHO_MAX_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande" }, { status: 400 });
  }

  await prisma.empresa.update({ where: { id: ctx.empresaId }, data: { logoUrl } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  await prisma.empresa.update({ where: { id: ctx.empresaId }, data: { logoUrl: null } });
  return NextResponse.json({ ok: true });
}
