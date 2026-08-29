import { prisma } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

export const EMPRESA_ATIVA_COOKIE = "assiz_empresa_ativa";

/**
 * Empresa em contexto pra esta requisição. Já vem resolvida dentro de
 * session.empresaId (ver src/lib/session.ts::resolverSessao) — tanto pra
 * usuários normais quanto pro super_admin, que "entra" numa empresa via o
 * mesmo cookie assiz_empresa_ativa; uma conta com várias MembroEmpresa
 * também troca de empresa ativa pelo mesmo mecanismo (POST
 * /api/empresas/[id]/entrar).
 */
export async function getEmpresaAtivaId(session: SessionPayload): Promise<string | null> {
  return session.empresaId;
}

/** Confere que um lead pertence à empresa em contexto, para evitar acesso cross-tenant via id adivinhado. */
export async function leadPertenceAEmpresa(leadId: string, empresaId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { empresaId: true } });
  return lead?.empresaId === empresaId;
}
