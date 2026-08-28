import { NextResponse } from "next/server";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { gerarApresentacaoPessoal, type TurnoOnboarding } from "@/lib/ai/onboardingEngine";
import { papelLabel } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const historico = (Array.isArray(body?.historico) ? body.historico : []) as TurnoOnboarding[];

  const resultado = await gerarApresentacaoPessoal(historico, session.nome.split(" ")[0], papelLabel(session.papel));
  return NextResponse.json(resultado);
}
