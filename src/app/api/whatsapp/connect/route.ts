import { NextResponse } from "next/server";
import {
  requireSession,
  isSessionResponse,
  requireRole,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { workerConnect } from "@/lib/whatsapp/worker";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  await prisma.whatsappSessao.upsert({
    where: { empresaId: ctx.empresaId },
    create: { empresaId: ctx.empresaId, status: "conectando" },
    update: { status: "conectando", numeroConectado: null },
  });

  try {
    const res = await workerConnect(ctx.empresaId);
    if (!res.ok) {
      return NextResponse.json({ erro: "Falha ao iniciar conexão no worker" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ erro: "whatsapp-worker indisponível" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
