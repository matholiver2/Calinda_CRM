import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEmpresaAtivaId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import type { Papel, SessionPayload } from "@/lib/auth";

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  // O JWT sozinho não sabe se o usuário foi desativado depois de logar —
  // confere no banco a cada chamada pra derrubar o acesso na hora (ver
  // src/lib/fetcher.ts, que redireciona pro login em qualquer 401).
  const usuario = await prisma.usuario.findUnique({ where: { id: session.id }, select: { ativo: true } });
  if (!usuario || !usuario.ativo) {
    return NextResponse.json({ erro: "Conta desativada" }, { status: 401 });
  }

  return session;
}

export function requireRole(session: SessionPayload, papeis: Papel[]): NextResponse | null {
  if (!papeis.includes(session.papel)) {
    return NextResponse.json({ erro: "Sem permissão para esta ação" }, { status: 403 });
  }
  return null;
}

export function isSessionResponse(x: SessionPayload | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}

/**
 * Para endpoints que operam sobre dados de uma empresa (leads, etapas,
 * agentes de IA, etc). Usuários comuns usam a própria empresa; super_admin
 * precisa ter "entrado" em uma empresa primeiro (ver src/lib/tenant.ts).
 */
export async function requireEmpresaContext(
  session: SessionPayload
): Promise<{ empresaId: string } | NextResponse> {
  const empresaId = await getEmpresaAtivaId(session);
  if (!empresaId) {
    return NextResponse.json(
      { erro: "Selecione uma empresa para continuar" },
      { status: 400 }
    );
  }
  return { empresaId };
}

export function isEmpresaContextResponse(
  x: { empresaId: string } | NextResponse
): x is NextResponse {
  return x instanceof NextResponse;
}
