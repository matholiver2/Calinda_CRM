import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

export const EMPRESA_ATIVA_COOKIE = "assiz_empresa_ativa";

/**
 * Resolve qual empresa deve ser usada para escopar os dados desta requisição.
 *
 * - Usuários normais (admin/gestor/vendedor) estão sempre presos à própria
 *   empresa (session.empresaId).
 * - super_admin não pertence a nenhuma empresa: só enxerga dados de uma
 *   empresa operacional quando "entra" nela via o seletor de empresas,
 *   o que grava o id escolhido no cookie `assiz_empresa_ativa`.
 */
export async function getEmpresaAtivaId(session: SessionPayload): Promise<string | null> {
  if (session.papel !== "super_admin") return session.empresaId;
  const store = await cookies();
  return store.get(EMPRESA_ATIVA_COOKIE)?.value ?? null;
}

/** Confere que um lead pertence à empresa em contexto, para evitar acesso cross-tenant via id adivinhado. */
export async function leadPertenceAEmpresa(leadId: string, empresaId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { empresaId: true } });
  return lead?.empresaId === empresaId;
}
