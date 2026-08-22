import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const convite = await prisma.convite.findUnique({
    where: { token },
    include: { empresa: { select: { nome: true } } },
  });

  if (!convite) return NextResponse.json({ erro: "Convite não encontrado" }, { status: 404 });

  const expirado = convite.status === "pendente" && convite.expiraEm < new Date();

  return NextResponse.json({
    email: convite.email,
    papel: convite.papel,
    empresaNome: convite.empresa?.nome ?? null,
    status: expirado ? "expirado" : convite.status,
  });
}
