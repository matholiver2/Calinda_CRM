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

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: ctx.empresaId },
    select: { id: true, nome: true, email: true, papel: true, ativo: true, avatarCor: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });
  return NextResponse.json({ usuarios });
}
