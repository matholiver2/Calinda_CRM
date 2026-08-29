import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getEmpresaAtivaId } from "@/lib/tenant";
import type { Papel, SessionPayload } from "@/lib/auth";

export async function requireSession(): Promise<SessionPayload | NextResponse> {
  // getSession já confere Usuario.ativo (conta) e MembroEmpresa.ativo
  // (acesso a esta empresa) e devolve null se qualquer um estiver desativado
  // — ver src/lib/session.ts::resolverSessao. O 401 aqui derruba o acesso na
  // hora (src/lib/fetcher.ts redireciona pro login em qualquer 401).
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
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
