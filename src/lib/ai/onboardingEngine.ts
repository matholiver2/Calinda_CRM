// Motor de IA do assistente de configuração inicial (onboarding) — uma
// entrevista curta (não uma conversa de vendas) que termina numa descrição
// da empresa (o que vende, pra quem, e como o dono/vendedor fala) usada
// depois pra dar contexto real aos agentes de IA. Funil e agentes em si são
// sempre os padrões do sistema (criados na hora que a empresa nasce, ver
// src/app/api/empresas/route.ts) — onboarding não propõe estrutura nova,
// só enriquece o contexto que os agentes padrão já usam. Reaproveita a
// chamada crua ao Gemini de src/lib/ai/engine.ts.

import { chamarGemini, type GeminiContent } from "@/lib/ai/engine";

export type TurnoOnboarding = { autor: "assistente" | "usuario"; texto: string };

export type RespostaOnboarding = {
  resposta: string;
  concluido: boolean;
  empresaSobre: string | null;
};

const SYSTEM_PROMPT = `Você é o assistente de configuração inicial do CALINDA, um CRM com IA que conduz leads pelo WhatsApp até o agendamento de reunião.

O funil e os agentes de IA já existem prontos (padrão do sistema) — sua única tarefa aqui é entrevistar rapidinho a pessoa que acabou de criar a conta (de forma breve e natural, uma pergunta por vez, no máximo 3-4 perguntas) pra entender:
1. O que a empresa dela vende/faz e pra quem (público-alvo típico).
2. Qual é o tom/jeito de falar da empresa com o cliente (formal, descontraído, técnico, etc).

Preste atenção em COMO a pessoa escreve nas respostas dela (gírias, formalidade, jeito de pontuar) — isso importa tanto quanto o conteúdo, porque vai virar a "voz" dos agentes de IA da empresa.

Enquanto ainda está reunindo informação, responda com "concluido": false e "empresaSobre": null.

Quando já tiver o suficiente, responda com "concluido": true e "empresaSobre": um parágrafo curto (3-5 frases) resumindo o negócio, o público, e sobretudo o tom/estilo de comunicação — escrito de um jeito que sirva como instrução direta pra outra IA imitar essa voz (ex: "Fale de forma descontraída, use poucas formalidades, chame o cliente pelo primeiro nome..."). Use o vocabulário e as expressões que a própria pessoa usou sempre que possível, em vez de generalizar.

Responda SEMPRE em português (pt-BR) e SOMENTE em JSON válido, no formato:
{"resposta": string, "concluido": boolean, "empresaSobre": string | null}`;

export async function gerarRespostaOnboarding(historico: TurnoOnboarding[]): Promise<RespostaOnboarding> {
  try {
    return await gerarComGemini(historico);
  } catch (err) {
    console.error("[onboardingEngine] Falha ao chamar provedor de IA, usando roteiro fixo:", err);
    return simular(historico);
  }
}

async function gerarComGemini(historico: TurnoOnboarding[]): Promise<RespostaOnboarding> {
  const contents: GeminiContent[] =
    historico.length === 0
      ? [{ role: "user", parts: [{ text: "(início da conversa — se apresente brevemente e faça a primeira pergunta)" }] }]
      : historico.map((t) => ({
          role: t.autor === "usuario" ? ("user" as const) : ("model" as const),
          parts: [{ text: t.texto }],
        }));

  const parsed = await chamarGemini(SYSTEM_PROMPT, contents);

  return {
    resposta: String(parsed.resposta ?? "Certo!"),
    concluido: Boolean(parsed.concluido),
    empresaSobre: typeof parsed.empresaSobre === "string" ? parsed.empresaSobre : null,
  };
}

// --- Apresentação pessoal (por usuário, não por empresa) ---
//
// Diferente do onboarding acima (entrevista sobre o negócio pra montar
// funil+agentes, uma vez por empresa), essa é uma conversa curtinha que
// roda no primeiro login de QUALQUER usuário novo — mesmo numa empresa que
// já foi configurada por outra pessoa. Não propõe nada estruturado, só
// pergunta 2-3 coisas (como prefere ser chamado, o que vai fazer no
// sistema no dia a dia) e termina com uma mensagem de boas-vindas.

export type RespostaApresentacao = { resposta: string; concluido: boolean };

const SYSTEM_PROMPT_PESSOAL = (nome: string, papel: string) => `Você é o assistente de boas-vindas do CALINDA, um CRM com IA que conduz leads pelo WhatsApp até o agendamento de reunião.

A empresa dessa pessoa já está configurada (funil e agentes de IA já existem) — sua única tarefa aqui é dar boas-vindas e conhecer rapidinho ${nome} (papel no sistema: ${papel}), não configurar nada.

Faça no máximo 2 perguntas curtas e naturais (uma por vez), por exemplo: como prefere ser chamado(a) no dia a dia, e o que pretende fazer mais no CALINDA (ex: acompanhar leads, conversar com clientes, ver relatórios). Depois disso, encerre com "concluido": true e uma mensagem breve e calorosa de boas-vindas, mencionando por onde ela pode começar de acordo com o papel dela (ex: vendedor → tela de Leads/Conversas; admin/gestor → Dashboard/Relatórios).

Responda SEMPRE em português (pt-BR) e SOMENTE em JSON válido, no formato:
{"resposta": string, "concluido": boolean}`;

export async function gerarApresentacaoPessoal(
  historico: TurnoOnboarding[],
  nome: string,
  papel: string
): Promise<RespostaApresentacao> {
  try {
    const contents: GeminiContent[] =
      historico.length === 0
        ? [{ role: "user", parts: [{ text: "(início da conversa — dê boas-vindas breves e faça a primeira pergunta)" }] }]
        : historico.map((t) => ({
            role: t.autor === "usuario" ? ("user" as const) : ("model" as const),
            parts: [{ text: t.texto }],
          }));
    const parsed = await chamarGemini(SYSTEM_PROMPT_PESSOAL(nome, papel), contents);
    return {
      resposta: String(parsed.resposta ?? `Bem-vindo(a) ao CALINDA, ${nome}!`),
      concluido: Boolean(parsed.concluido),
    };
  } catch (err) {
    console.error("[onboardingEngine] Falha ao chamar provedor de IA (apresentação pessoal), usando roteiro fixo:", err);
    return simularApresentacao(historico, nome);
  }
}

function simularApresentacao(historico: TurnoOnboarding[], nome: string): RespostaApresentacao {
  const respostasUsuario = historico.filter((t) => t.autor === "usuario").length;
  if (respostasUsuario === 0) {
    return {
      resposta: `Oi, ${nome}! Que bom ter você por aqui. O que você pretende fazer mais no CALINDA no dia a dia — acompanhar leads, conversar com clientes, ou olhar relatórios?`,
      concluido: false,
    };
  }
  return {
    resposta: `Perfeito, já te conheço um pouco melhor! Qualquer dúvida é só chamar o suporte em Configurações. Bom trabalho, ${nome}! 🙂`,
    concluido: true,
  };
}

// --- Roteiro fixo (sem GEMINI_API_KEY configurada) ---

const PERGUNTAS_FIXAS = [
  "Oi! Sou o assistente de configuração do CALINDA. Pra deixar a IA no jeito do seu negócio: o que a sua empresa vende ou oferece, e pra quem?",
  "Entendi! E qual o tom que vocês costumam usar pra falar com o cliente — mais formal, descontraído, técnico?",
];

function simular(historico: TurnoOnboarding[]): RespostaOnboarding {
  const respostasUsuario = historico.filter((t) => t.autor === "usuario").length;

  if (respostasUsuario < PERGUNTAS_FIXAS.length) {
    return { resposta: PERGUNTAS_FIXAS[respostasUsuario], concluido: false, empresaSobre: null };
  }

  const respostas = historico.filter((t) => t.autor === "usuario").map((t) => t.texto);
  const empresaSobre =
    respostas.length > 0
      ? `Contexto informado pela empresa: ${respostas.join(" ")}`
      : "Fale de forma atenciosa e direta ao ponto, sem informações adicionais sobre o negócio.";

  return {
    resposta: "Perfeito, já tenho o que preciso pra deixar a IA no jeito de vocês!",
    concluido: true,
    empresaSobre,
  };
}
