import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { leadPertenceAEmpresa } from "@/lib/tenant";
import { sincronizarReuniaoComGoogle } from "@/lib/googleCalendarSync";
import { enviarConviteReuniaoPorEmail } from "@/lib/reuniaoEmail";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const reunioes = await prisma.reuniao.findMany({
    where: {
      lead: { empresaId: ctx.empresaId },
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { dataHora: "asc" },
    include: { lead: true, vendedor: { select: { id: true, nome: true, avatarCor: true } } },
  });
  return NextResponse.json({ reunioes });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const leadId = String(body?.leadId ?? "");
  const dataHora = body?.dataHora ? new Date(body.dataHora) : null;
  if (!leadId || !dataHora) {
    return NextResponse.json({ erro: "leadId e dataHora são obrigatórios" }, { status: 400 });
  }
  if (!(await leadPertenceAEmpresa(leadId, ctx.empresaId))) {
    return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
  }

  const reuniao = await prisma.reuniao.create({
    data: {
      leadId,
      vendedorId: body?.vendedorId ?? (session.papel === "super_admin" ? null : session.id),
      dataHora,
      status: body?.status ?? "agendada",
      resultado: "pendente",
      linkCalendario: body?.linkCalendario ?? null,
      modalidade: body?.modalidade ?? "whatsapp",
    },
    include: { lead: true, vendedor: true },
  });
  void sincronizarReuniaoComGoogle(reuniao.id);
  void enviarConviteReuniaoPorEmail(reuniao.id);
  return NextResponse.json({ reuniao }, { status: 201 });
}
