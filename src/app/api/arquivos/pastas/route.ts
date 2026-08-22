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

  const pastas = await prisma.pastaArquivo.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { nome: "asc" },
    include: { _count: { select: { arquivos: true } } },
  });
  return NextResponse.json({ pastas });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return NextResponse.json({ erro: "Nome da pasta é obrigatório" }, { status: 400 });

  const pasta = await prisma.pastaArquivo.create({ data: { empresaId: ctx.empresaId, nome } });
  return NextResponse.json({ pasta }, { status: 201 });
}
