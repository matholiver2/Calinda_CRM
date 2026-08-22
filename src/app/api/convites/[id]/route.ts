import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  await prisma.convite.update({ where: { id }, data: { status: "revogado" } });
  return NextResponse.json({ ok: true });
}
