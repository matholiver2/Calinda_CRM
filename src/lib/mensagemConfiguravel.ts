import { prisma } from "@/lib/db";
import { gerarMensagemComBase, type MensagemContexto } from "@/lib/ai/engine";

/**
 * Resolve o texto de uma mensagem configurável (primeira mensagem,
 * remarketing, finalização) de acordo com o modo escolhido em Configurar
 * IA: "literal" manda o texto exatamente como escrito (com {nome}/
 * {empresa} substituídos); "ia" usa esse mesmo texto só como base, pedindo
 * pra IA escrever uma versão adaptada a cada envio. Devolve null se a
 * empresa nunca configurou nada pra essa chave — quem chama decide o
 * fallback (cada mensagem tem o próprio comportamento sem configuração).
 */
export async function resolverTextoConfiguravel(params: {
  empresaId: string;
  chaveTemplate: string;
  chaveModo: string;
  leadNome: string;
  empresaNome: string;
  persona: string;
  tarefa: string;
  historico?: MensagemContexto[];
}): Promise<string | null> {
  const configs = await prisma.configuracao.findMany({
    where: { empresaId: params.empresaId, chave: { in: [params.chaveTemplate, params.chaveModo] } },
  });
  const template = configs.find((c) => c.chave === params.chaveTemplate)?.valor;
  if (!template) return null;

  const substituido = template
    .replaceAll("{nome}", params.leadNome.split(" ")[0])
    .replaceAll("{empresa}", params.empresaNome);

  const modo = configs.find((c) => c.chave === params.chaveModo)?.valor ?? "literal";
  if (modo !== "ia") return substituido;

  return gerarMensagemComBase({
    baseTexto: substituido,
    tarefa: params.tarefa,
    leadNome: params.leadNome,
    persona: params.persona,
    historico: params.historico,
  });
}
