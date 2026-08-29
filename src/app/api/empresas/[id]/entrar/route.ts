import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

/**
 * Troca a empresa ativa da sessão (cookie assiz_empresa_ativa) — usado tanto
 * pelo super_admin (acesso irrestrito a qualquer empresa, comportamento
 * original) quanto por qualquer conta com MembroEmpresa ativo naquela
 * empresa (multi-empresa por conta única, ver src/lib/session.ts).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const { id } = await params;

  if (session.papel !== "super_admin") {
    const membro = await prisma.membroEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: session.id, empresaId: id } },
    });
    if (!membro || !membro.ativo) {
      return NextResponse.json({ erro: "Sem permissão para esta ação" }, { status: 403 });
    }
  }

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
