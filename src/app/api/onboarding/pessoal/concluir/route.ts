import { NextResponse } from "next/server";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { marcarOnboardingPessoal } from "@/lib/onboarding";

/** Usado tanto ao terminar a conversa quanto ao clicar "Pular" — nos dois casos só marca que essa pessoa já viu. */
export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  await marcarOnboardingPessoal(session.id);
  return NextResponse.json({ ok: true });
}
