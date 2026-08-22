import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireRole,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { workerDisconnect } from "@/lib/whatsapp/worker";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  try {
    await workerDisconnect(ctx.empresaId);
  } catch {
    // Mesmo se o worker estiver fora do ar, marcamos como desconectado no
    // banco abaixo — evita que a UI fique presa em "conectado" indefinidamente.
  }

  await prisma.whatsappSessao.upsert({
    where: { empresaId: ctx.empresaId },
    create: { empresaId: ctx.empresaId, status: "desconectado" },
    update: { status: "desconectado", numeroConectado: null },
  });

  return NextResponse.json({ ok: true });
}
