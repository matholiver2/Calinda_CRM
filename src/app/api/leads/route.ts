import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { dispararPrimeiraMensagem } from "@/lib/conversationService";
import { normalizarTelefone } from "@/lib/utils";
import type { Prisma, StatusLead } from "@prisma/client";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const etapaId = searchParams.get("etapaId");
  const origem = searchParams.get("origem");
  const vendedorId = searchParams.get("vendedorId");
  const status = searchParams.get("status");
  const busca = searchParams.get("busca");

  const where: Prisma.LeadWhereInput = { empresaId: ctx.empresaId };
  if (etapaId) where.etapaAtualId = etapaId;
  if (origem) where.origem = origem;
  if (vendedorId) where.vendedorId = vendedorId;
  if (status) where.status = status as StatusLead;
  if (busca) {
    where.OR = [
      { nome: { contains: busca } },
      { telefone: { contains: busca } },
      { email: { contains: busca } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      etapaAtual: true,
      vendedor: { select: { id: true, nome: true, avatarCor: true } },
      _count: { select: { mensagens: true } },
    },
    orderBy: { atualizadoEm: "desc" },
  });

  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  const telefone = normalizarTelefone(String(body?.telefone ?? ""));
  if (!nome || !telefone) {
    return NextResponse.json({ erro: "Nome e telefone são obrigatórios" }, { status: 400 });
  }

  const existente = await prisma.lead.findUnique({
    where: { empresaId_telefone: { empresaId: ctx.empresaId, telefone } },
  });
  if (existente) {
    return NextResponse.json({ erro: "Já existe um lead com esse telefone" }, { status: 409 });
  }

  const primeiraEtapa = await prisma.etapaFunil.findFirst({
    where: { empresaId: ctx.empresaId, tipo: "funil" },
    orderBy: { ordem: "asc" },
  });
  if (!primeiraEtapa) {
    return NextResponse.json({ erro: "Nenhuma etapa de funil configurada" }, { status: 500 });
  }

  const lead = await prisma.lead.create({
    data: {
      empresaId: ctx.empresaId,
      nome,
      telefone,
      email: body?.email ?? null,
      origem: body?.origem ?? "Não informado",
      etapaAtualId: primeiraEtapa.id,
    },
    include: { etapaAtual: true },
  });

  await prisma.historicoEtapa.create({
    data: { leadId: lead.id, etapaId: primeiraEtapa.id, motivoTransicao: "criacao_lead" },
  });

  try {
    await dispararPrimeiraMensagem(lead.id);
  } catch (err) {
    console.error("[leads] Falha ao disparar primeira mensagem automática:", err);
  }

  return NextResponse.json({ lead }, { status: 201 });
}
