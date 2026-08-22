import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { gerarRespostaOnboarding, type TurnoOnboarding } from "@/lib/ai/onboardingEngine";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const historico = (Array.isArray(body?.historico) ? body.historico : []) as TurnoOnboarding[];

  const etapas = await prisma.etapaFunil.findMany({
    where: { empresaId: ctx.empresaId },
    select: { nome: true },
  });

  const resultado = await gerarRespostaOnboarding(
    historico,
    etapas.map((e) => e.nome)
  );
  return NextResponse.json(resultado);
}
