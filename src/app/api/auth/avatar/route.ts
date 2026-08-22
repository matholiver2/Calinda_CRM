import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";

const TAMANHO_MAX_BYTES = 2 * 1024 * 1024; // 2MB em base64

/**
 * Foto de perfil salva como data URL direto no banco (sem infra de storage
 * configurada no projeto) — suficiente pro tamanho de um avatar já
 * redimensionado no client antes do upload.
 */
export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const avatarUrl = body?.avatarUrl;

  if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("data:image/")) {
    return NextResponse.json({ erro: "Imagem inválida" }, { status: 400 });
  }
  if (avatarUrl.length > TAMANHO_MAX_BYTES) {
    return NextResponse.json({ erro: "Imagem muito grande" }, { status: 400 });
  }

  await prisma.usuario.update({ where: { id: session.id }, data: { avatarUrl } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  await prisma.usuario.update({ where: { id: session.id }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true });
}
