import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: { googleCalendarRefreshToken: true, googleCalendarEmail: true },
  });

  return NextResponse.json({
    conectado: !!usuario?.googleCalendarRefreshToken,
    email: usuario?.googleCalendarEmail ?? null,
  });
}
