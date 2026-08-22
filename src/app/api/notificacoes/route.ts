import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const [notificacoes, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: { empresaId: ctx.empresaId },
      orderBy: { criadoEm: "desc" },
      take: 30,
    }),
    prisma.notificacao.count({ where: { empresaId: ctx.empresaId, lida: false } }),
  ]);

  return NextResponse.json({ notificacoes, naoLidas });
}
