import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEmpresaAtivaId } from "@/lib/tenant";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ usuario: null }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      avatarCor: true,
      avatarUrl: true,
      empresaId: true,
      googleId: true,
      senhaHash: true,
      empresa: { select: { id: true, nome: true, logoUrl: true } },
    },
  });
  if (!usuario) return NextResponse.json({ usuario: null }, { status: 401 });

  const empresaAtivaId = await getEmpresaAtivaId(session);
  let empresaAtiva = usuario.empresa;
  if (session.papel === "super_admin" && empresaAtivaId) {
    empresaAtiva = await prisma.empresa.findUnique({
      where: { id: empresaAtivaId },
      select: { id: true, nome: true, logoUrl: true },
    });
  }

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      avatarCor: usuario.avatarCor,
      avatarUrl: usuario.avatarUrl,
      empresaId: usuario.empresaId,
      empresa: usuario.empresa,
      temSenha: !!usuario.senhaHash,
      temGoogle: !!usuario.googleId,
      empresaAtiva,
    },
  });
}
