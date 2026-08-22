import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { marcarOnboarding } from "@/lib/onboarding";

export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  await marcarOnboarding(ctx.empresaId, "pulado");
  return NextResponse.json({ ok: true });
}
