import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken, type IdentidadePayload, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

/**
 * Resolve a sessão completa (papel + empresa ativa) a partir de uma
 * identidade já autenticada. Papel/empresaId não vêm do JWT — uma conta
 * pode ter MembroEmpresa em várias empresas (multi-empresa por conta
 * única), então isso é calculado a cada chamada:
 * - super_admin (Usuario.superAdmin) não tem MembroEmpresa nenhum — "entra"
 *   numa empresa operacional via o cookie assiz_empresa_ativa, exatamente
 *   como já funcionava antes desta conta única existir pra usuários normais.
 * - Usuário comum: usa o MembroEmpresa apontado pelo cookie (se válido e
 *   ativo); sem cookie ou inválido, cai no primeiro MembroEmpresa ativo
 *   (o mais antigo) — assim quem só tem uma empresa nem percebe diferença,
 *   e quem tem várias sempre abre numa válida, trocando depois pela UI.
 */
export async function resolverSessao(identidade: IdentidadePayload): Promise<SessionPayload | null> {
  const usuario = await prisma.usuario.findUnique({ where: { id: identidade.id } });
  if (!usuario || !usuario.ativo) return null;

  if (usuario.superAdmin) {
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: "super_admin", empresaId: null };
  }

  const store = await cookies();
  const empresaAtivaCookie = store.get(EMPRESA_ATIVA_COOKIE)?.value;

  let membro = empresaAtivaCookie
    ? await prisma.membroEmpresa.findUnique({
        where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresaAtivaCookie } },
      })
    : null;
  if (!membro?.ativo) {
    membro = await prisma.membroEmpresa.findFirst({
      where: { usuarioId: usuario.id, ativo: true },
      orderBy: { criadoEm: "asc" },
    });
  }
  if (!membro || !membro.ativo) return null;

  return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: membro.papel, empresaId: membro.empresaId };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const identidade = verifyToken(token);
  if (!identidade) return null;
  return resolverSessao(identidade);
}
