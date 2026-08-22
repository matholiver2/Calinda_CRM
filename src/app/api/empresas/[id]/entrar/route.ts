import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 });

  const res = NextResponse.json({ ok: true, empresa });
  res.cookies.set(EMPRESA_ATIVA_COOKIE, id, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
