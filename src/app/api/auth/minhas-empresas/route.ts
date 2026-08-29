import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";

/**
 * Empresas da conta logada (MembroEmpresa ativos) — usado pelo seletor de
 * troca de empresa (multi-empresa por conta única). super_admin não tem
 * MembroEmpresa nenhum e usa /empresas (todas as empresas da plataforma).
 */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  if (session.papel === "super_admin") {
    return NextResponse.json({ empresas: [] });
  }

  const membros = await prisma.membroEmpresa.findMany({
    where: { usuarioId: session.id, ativo: true },
    include: { empresa: { select: { id: true, nome: true, logoUrl: true } } },
    orderBy: { criadoEm: "asc" },
  });

  return NextResponse.json({
    empresas: membros.map((m) => ({
      id: m.empresa.id,
      nome: m.empresa.nome,
      logoUrl: m.empresa.logoUrl,
      papel: m.papel,
      ativa: m.empresaId === session.empresaId,
    })),
  });
}
