import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

// Criação de usuário acontece exclusivamente via convite (POST /api/convites)
// — acesso ao sistema é somente por convite, conforme regra de negócio.
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const membros = await prisma.membroEmpresa.findMany({
    where: { empresaId: ctx.empresaId },
    include: { usuario: { select: { id: true, nome: true, email: true, avatarCor: true } } },
    orderBy: { criadoEm: "asc" },
  });

  const usuarios = membros.map((m) => ({
    id: m.id,
    nome: m.usuario.nome,
    email: m.usuario.email,
    papel: m.papel,
    ativo: m.ativo,
    avatarCor: m.usuario.avatarCor,
    criadoEm: m.criadoEm,
  }));

  return NextResponse.json({ usuarios });
}
