import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const empresas = await prisma.empresa.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { usuarios: true, leads: true } } },
  });
  return NextResponse.json({ empresas });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return NextResponse.json({ erro: "Nome da empresa é obrigatório" }, { status: 400 });

  const empresa = await prisma.empresa.create({ data: { nome } });

  // Etapa inicial padrão para a empresa não nascer completamente vazia.
  await prisma.etapaFunil.create({
    data: {
      empresaId: empresa.id,
      nome: "Novo Lead",
      ordem: 1,
      cor: "#F87171",
      tipo: "funil",
      descricaoObjetivo: "Primeiro contato e abertura de conversa.",
    },
  });
  await prisma.configuracao.create({ data: { empresaId: empresa.id, chave: "leads_parados_dias", valor: "3" } });

  return NextResponse.json({ empresa }, { status: 201 });
}
