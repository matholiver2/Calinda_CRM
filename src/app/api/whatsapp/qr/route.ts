import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { workerGetQr } from "@/lib/whatsapp/worker";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  try {
    const res = await workerGetQr(ctx.empresaId);
    if (!res.ok) return NextResponse.json({ qr: null });
    const data = (await res.json().catch(() => null)) as { qr?: string } | null;
    return NextResponse.json({ qr: data?.qr ?? null });
  } catch {
    return NextResponse.json({ qr: null });
  }
}
