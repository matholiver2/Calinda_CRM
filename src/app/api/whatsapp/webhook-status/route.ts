import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Callback do whatsapp-worker: reporta mudanças de status da sessão Baileys
 * de uma empresa (conectando/conectado/desconectado). Autenticado só por
 * secret compartilhado — não é uma rota de usuário, é o worker chamando.
 */
export async function POST(req: Request) {
  const secretEsperado = process.env.WHATSAPP_WORKER_SECRET;
  if (!secretEsperado || req.headers.get("x-worker-secret") !== secretEsperado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const empresaId = String(body?.empresaId ?? "").trim();
  const status = body?.status;
  const numeroConectado = body?.numeroConectado ? String(body.numeroConectado) : null;

  if (!empresaId || !["desconectado", "conectando", "conectado"].includes(status)) {
    return NextResponse.json({ erro: "empresaId e status válidos são obrigatórios" }, { status: 400 });
  }

  await prisma.whatsappSessao.upsert({
    where: { empresaId },
    create: { empresaId, status, numeroConectado },
    update: { status, numeroConectado },
  });

  return NextResponse.json({ ok: true });
}
