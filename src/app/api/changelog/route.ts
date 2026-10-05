import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { CHANGELOG, entradasNaoVistas } from "@/lib/changelog";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: { changelogVistoEm: true },
  });

  return NextResponse.json({
    entradas: CHANGELOG,
    naoVistas: entradasNaoVistas(usuario?.changelogVistoEm ?? null).length,
  });
}
