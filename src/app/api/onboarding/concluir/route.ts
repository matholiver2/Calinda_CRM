import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { marcarOnboarding } from "@/lib/onboarding";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const empresaSobre = typeof body?.empresaSobre === "string" ? body.empresaSobre.trim() : "";

  if (empresaSobre) {
    await prisma.configuracao.upsert({
      where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "empresa_sobre" } },
      create: { empresaId: ctx.empresaId, chave: "empresa_sobre", valor: empresaSobre },
      update: { valor: empresaSobre },
    });

    // Funil e agentes são sempre os padrões do sistema (criados na hora que
    // a empresa nasce) — onboarding não recria nem renomeia nada, só injeta
    // o contexto real da empresa na persona de cada agente padrão, pra IA
    // falar no jeito da empresa em vez de um texto genérico.
    const empresa = await prisma.empresa.findUnique({ where: { id: ctx.empresaId }, select: { nome: true } });
    await prisma.agenteIa.updateMany({
      where: { empresaId: ctx.empresaId },
      data: {
        persona: `Você é o assistente virtual da ${empresa?.nome ?? "empresa"}. ${empresaSobre}`,
        modeloLlm: "gemini-3.6-flash",
      },
    });
  }

  await marcarOnboarding(ctx.empresaId, "concluido");

  return NextResponse.json({ ok: true });
}
