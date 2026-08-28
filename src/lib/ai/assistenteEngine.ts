// Motor de IA do "Assistente" — chat de apoio ao vendedor, distinto do
// motor que conversa com o lead (src/lib/ai/engine.ts). Usa o mesmo
// provedor (chamarGemini) e o contexto da empresa definido no onboarding
// (Configuracao "empresa_sobre") pra dar respostas relevantes ao negócio.

import { chamarGemini, type GeminiContent } from "@/lib/ai/engine";

export type TurnoAssistente = { autor: "assistente" | "usuario"; texto: string };

export type ContextoAssistente = {
  empresaNome: string;
  empresaSobre: string | null;
  usuarioNome: string;
};

function montarSystemPrompt(ctx: ContextoAssistente): string {
  return `Você é o Assistente de Vendas do CALINDA, um CRM com IA que conduz leads pelo WhatsApp até o agendamento de reunião.

Você está conversando com ${ctx.usuarioNome}, vendedor(a) da empresa ${ctx.empresaNome}, dentro do próprio CRM (não com um lead/cliente).
${ctx.empresaSobre ? `Contexto sobre a empresa: ${ctx.empresaSobre}` : ""}

Sua função é ajudar ${ctx.usuarioNome} a vender melhor: sugerir como responder um lead difícil, ajudar a montar uma proposta ou argumento de venda, revisar uma mensagem antes de enviar, dar dicas de follow-up, ajudar a priorizar quais leads atacar primeiro, esclarecer dúvidas sobre o processo comercial da empresa. Não é um assistente genérico — mantenha o foco em vendas e no dia a dia comercial dessa empresa.

Responda em português (pt-BR), de forma direta e prática (evite textos longos, use listas curtas quando ajudar).

Responda SOMENTE em JSON válido, no formato:
{"resposta": string}`;
}

export async function gerarRespostaAssistente(
  historico: TurnoAssistente[],
  contexto: ContextoAssistente
): Promise<string> {
  try {
    const contents: GeminiContent[] = historico.map((t) => ({
      role: t.autor === "usuario" ? ("user" as const) : ("model" as const),
      parts: [{ text: t.texto }],
    }));
    const parsed = await chamarGemini(montarSystemPrompt(contexto), contents);
    return String(parsed.resposta ?? "Certo!");
  } catch (err) {
    console.error("[assistenteEngine] Falha ao chamar provedor de IA, usando resposta padrão:", err);
    return "No momento não consigo pensar numa resposta (IA indisponível) — tenta de novo daqui a pouco.";
  }
}
