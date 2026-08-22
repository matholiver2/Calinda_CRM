import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const empresa = await prisma.empresa.update({
    where: { id },
    data: { nome: body?.nome, ativo: body?.ativo },
  });
  return NextResponse.json({ empresa });
}
