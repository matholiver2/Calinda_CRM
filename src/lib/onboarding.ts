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
