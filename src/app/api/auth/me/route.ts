import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ usuario: null }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      nome: true,
      email: true,
      avatarCor: true,
      avatarUrl: true,
      googleId: true,
      senhaHash: true,
    },
  });
  if (!usuario) return NextResponse.json({ usuario: null }, { status: 401 });

  const empresaAtiva = session.empresaId
    ? await prisma.empresa.findUnique({
        where: { id: session.empresaId },
        select: { id: true, nome: true, logoUrl: true },
      })
    : null;

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: session.papel,
      avatarCor: usuario.avatarCor,
      avatarUrl: usuario.avatarUrl,
      empresaId: session.empresaId,
      empresa: empresaAtiva,
      temSenha: !!usuario.senhaHash,
      temGoogle: !!usuario.googleId,
      empresaAtiva,
    },
  });
}
