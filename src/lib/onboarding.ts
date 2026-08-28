import { prisma } from "@/lib/db";

export const ONBOARDING_CHAVE = "onboarding_status";

/**
 * Empresa "precisa" do assistente de onboarding se nunca teve nenhum Agente
 * de IA criado e ninguém ainda concluiu/pulou o assistente — dispara uma
 * única vez, no primeiro acesso de um admin/gestor.
 */
export async function precisaOnboarding(empresaId: string): Promise<boolean> {
  const [totalAgentes, flag] = await Promise.all([
    prisma.agenteIa.count({ where: { empresaId } }),
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId, chave: ONBOARDING_CHAVE } },
    }),
  ]);
  return totalAgentes === 0 && !flag;
}

export async function marcarOnboarding(empresaId: string, valor: "concluido" | "pulado"): Promise<void> {
  await prisma.configuracao.upsert({
    where: { empresaId_chave: { empresaId, chave: ONBOARDING_CHAVE } },
    create: { empresaId, chave: ONBOARDING_CHAVE, valor },
    update: { valor },
  });
}

/**
 * Diferente do onboarding da empresa (funil + agentes, uma vez só por
 * empresa), esse é por USUÁRIO — dispara no primeiro login de qualquer
 * pessoa nova, mesmo numa empresa que já foi configurada por outra pessoa.
 * É uma apresentação curta, não remonta funil/agentes.
 */
export async function precisaOnboardingPessoal(usuarioId: string): Promise<boolean> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { onboardingPessoalConcluido: true },
  });
  return !usuario?.onboardingPessoalConcluido;
}

export async function marcarOnboardingPessoal(usuarioId: string): Promise<void> {
  await prisma.usuario.update({ where: { id: usuarioId }, data: { onboardingPessoalConcluido: true } });
}
