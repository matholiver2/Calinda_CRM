import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

const LIMITE = 5;

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ leads: [], arquivos: [], reunioes: [] });
  }

  const [leads, arquivos, reunioes] = await Promise.all([
    prisma.lead.findMany({
      where: {
        empresaId: ctx.empresaId,
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { telefone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nome: true, telefone: true, status: true },
      take: LIMITE,
    }),
    prisma.arquivo.findMany({
      where: { empresaId: ctx.empresaId, nome: { contains: q, mode: "insensitive" } },
      select: { id: true, nome: true, pastaId: true, pasta: { select: { nome: true } } },
      take: LIMITE,
    }),
    prisma.reuniao.findMany({
      where: {
        lead: { empresaId: ctx.empresaId, nome: { contains: q, mode: "insensitive" } },
      },
      select: { id: true, dataHora: true, leadId: true, lead: { select: { nome: true } } },
      orderBy: { dataHora: "desc" },
      take: LIMITE,
    }),
  ]);

  return NextResponse.json({ leads, arquivos, reunioes });
}
