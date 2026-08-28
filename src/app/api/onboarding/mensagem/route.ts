import { NextResponse } from "next/server";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { gerarRespostaOnboarding, type TurnoOnboarding } from "@/lib/ai/onboardingEngine";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const historico = (Array.isArray(body?.historico) ? body.historico : []) as TurnoOnboarding[];

  const resultado = await gerarRespostaOnboarding(historico);
  return NextResponse.json(resultado);
}
