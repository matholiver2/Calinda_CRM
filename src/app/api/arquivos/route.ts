import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const pastaId = searchParams.get("pastaId");
  if (!pastaId) return NextResponse.json({ erro: "pastaId é obrigatório" }, { status: 400 });

  const arquivos = await prisma.arquivo.findMany({
    where: { pastaId, empresaId: ctx.empresaId },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json({ arquivos });
}

/** Confirma um upload já concluído no Supabase Storage e grava a linha do arquivo. */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const pastaId = String(body?.pastaId ?? "");
  const nome = String(body?.nome ?? "");
  const storagePath = String(body?.storagePath ?? "");
  const tamanhoBytes = Number(body?.tamanhoBytes ?? 0);
  const mimeType = String(body?.mimeType ?? "application/octet-stream");

  if (!pastaId || !nome || !storagePath) {
    return NextResponse.json({ erro: "Dados incompletos" }, { status: 400 });
  }

  const pasta = await prisma.pastaArquivo.findUnique({ where: { id: pastaId } });
  if (!pasta || pasta.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Pasta não encontrada" }, { status: 404 });
  }

  const arquivo = await prisma.arquivo.create({
    data: {
      empresaId: ctx.empresaId,
      pastaId,
      nome,
      storagePath,
      tamanhoBytes,
      mimeType,
      criadoPorId: session.id,
    },
  });
  return NextResponse.json({ arquivo }, { status: 201 });
}
