import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";

export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  await prisma.usuario.update({
    where: { id: session.id },
    data: { changelogVistoEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
