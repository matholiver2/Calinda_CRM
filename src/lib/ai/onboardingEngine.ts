// Motor de IA do assistente de configuração inicial (onboarding) — uma
// entrevista curta (não uma conversa de vendas) que termina numa proposta
// estruturada de etapas de funil + agentes de IA sob medida pro negócio do
// usuário. Reaproveita a chamada crua ao Gemini de src/lib/ai/engine.ts.

import { chamarGemini, type GeminiContent } from "@/lib/ai/engine";

export type TurnoOnboarding = { autor: "assistente" | "usuario"; texto: string };

export type EtapaProposta = { nome: string; ordem: number; cor: string; descricaoObjetivo: string };
export type AgenteProposto = { etapaNome: string; nome: string; persona: string; objetivo: string };

export type RespostaOnboarding = {
  resposta: string;
  concluido: boolean;
  proposta: { etapas: EtapaProposta[]; agentes: AgenteProposto[] } | null;
};

const ARQUETIPOS = `Arquétipos de agente que o CALINDA já usa como referência (o usuário pode querer todos, só alguns, ou variações):
- Recepção: primeiro contato, dá boas-vindas e entende o que o lead procura.
- Descoberta/Qualificação: entende a dor, o contexto e se o lead tem perfil pra fechar.
- Fechamento: propõe reunião/agendamento com um vendedor humano.
- Remarketing: reengaja quem esfriou ou não fechou depois de uma reunião.`;

const SYSTEM_PROMPT = `Você é o assistente de configuração inicial do CALINDA, um CRM com IA que conduz leads pelo WhatsApp até o agendamento de reunião.

Sua tarefa é entrevistar a pessoa que acabou de criar a conta, de forma breve e natural (uma pergunta por vez, no máximo 4-5 perguntas no total), para descobrir:
1. O que a empresa dela vende/faz.
2. Quem são os leads/clientes típicos.
3. Como é o processo de vendas hoje (quantas etapas, do primeiro contato até fechar).
4. Quantos e quais tipos de agente de IA ela quer.

${ARQUETIPOS}

Apresente esses arquétipos numa das suas mensagens (de forma resumida, natural, não como uma lista fria) pra ela entender as opções antes de decidir quantos/quais quer.

Enquanto ainda está reunindo informação, responda com "concluido": false e "proposta": null.

Quando já tiver o suficiente (não precisa esgotar todas as perguntas se a pessoa já deu contexto rico), responda com "concluido": true e uma "proposta" com:
- "etapas": lista ordenada de etapas de funil sob medida (nome, ordem começando em 1, cor em hex, descricaoObjetivo — o que a IA deve alcançar nessa etapa), cobrindo do primeiro contato até o fechamento/reunião.
- "agentes": um agente por etapa relevante (etapaNome deve bater exatamente com o nome de uma etapa da lista acima), com persona (quem é o agente e a empresa, escrito com base no que a pessoa contou) e objetivo (o que ele deve alcançar nessa etapa) — nada de texto genérico, use o contexto real que a pessoa deu.

Responda SEMPRE em português (pt-BR) e SOMENTE em JSON válido, no formato:
{"resposta": string, "concluido": boolean, "proposta": {"etapas": [{"nome": string, "ordem": number, "cor": string, "descricaoObjetivo": string}], "agentes": [{"etapaNome": string, "nome": string, "persona": string, "objetivo": string}]} | null}`;

export async function gerarRespostaOnboarding(
  historico: TurnoOnboarding[],
  etapasExistentes: string[] = []
): Promise<RespostaOnboarding> {
  try {
    return await gerarComGemini(historico, etapasExistentes);
  } catch (err) {
    console.error("[onboardingEngine] Falha ao chamar provedor de IA, usando roteiro fixo:", err);
    return simular(historico);
  }
}

async function gerarComGemini(historico: TurnoOnboarding[], etapasExistentes: string[]): Promise<RespostaOnboarding> {
  const systemPrompt =
    etapasExistentes.length > 0
      ? `${SYSTEM_PROMPT}\n\nA empresa já tem estas etapas cadastradas: ${etapasExistentes.join(", ")}. Pode reaproveitar alguma pelo nome exato, ou propor um conjunto novo mais adequado ao que a pessoa descrever — as que não existirem ainda serão criadas.`
      : SYSTEM_PROMPT;

  const contents: GeminiContent[] =
    historico.length === 0
      ? [{ role: "user", parts: [{ text: "(início da conversa — se apresente brevemente e faça a primeira pergunta)" }] }]
      : historico.map((t) => ({
          role: t.autor === "usuario" ? ("user" as const) : ("model" as const),
          parts: [{ text: t.texto }],
        }));

  const parsed = await chamarGemini(systemPrompt, contents);

  return {
    resposta: String(parsed.resposta ?? "Certo!"),
    concluido: Boolean(parsed.concluido),
    proposta: (parsed.proposta as RespostaOnboarding["proposta"]) ?? null,
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
  "Oi! Sou o assistente de configuração do CALINDA. Pra deixar a IA no jeito do seu negócio: o que a sua empresa vende ou oferece?",
  "Entendi! E quem costuma ser o lead típico que chega até vocês?",
  "Legal. Como é o processo de vendas hoje — desde o primeiro contato até fechar, quantas etapas mais ou menos vocês seguem?",
  "Por último: você quer os 4 tipos de agente (Recepção, Qualificação, Fechamento e Remarketing), ou prefere só alguns deles pra começar?",
];

function simular(historico: TurnoOnboarding[]): RespostaOnboarding {
  const respostasUsuario = historico.filter((t) => t.autor === "usuario").length;

  if (respostasUsuario < PERGUNTAS_FIXAS.length) {
    return { resposta: PERGUNTAS_FIXAS[respostasUsuario], concluido: false, proposta: null };
  }

  const etapas: EtapaProposta[] = [
    { nome: "Novo Lead", ordem: 1, cor: "#F87171", descricaoObjetivo: "Primeiro contato e abertura de conversa." },
    { nome: "Qualificando", ordem: 2, cor: "#FBBF24", descricaoObjetivo: "Entender a dor e o contexto do lead." },
    {
      nome: "Reunião Agendada",
      ordem: 3,
      cor: "#34D399",
      descricaoObjetivo: "Propor e confirmar reunião com um vendedor.",
    },
  ];
  const agentes: AgenteProposto[] = [
    {
      etapaNome: "Novo Lead",
      nome: "Agente de Recepção",
      persona: "Assistente virtual da empresa, tom simpático e direto.",
      objetivo: "Dar boas-vindas ao lead e entender o que ele procura.",
    },
    {
      etapaNome: "Qualificando",
      nome: "Agente de Qualificação",
      persona: "Assistente virtual da empresa, tom consultivo.",
      objetivo: "Entender a dor do lead e validar se faz sentido seguir.",
    },
    {
      etapaNome: "Reunião Agendada",
      nome: "Agente de Fechamento",
      persona: "Assistente virtual da empresa, tom proativo.",
      objetivo: "Propor e confirmar um horário de reunião com um vendedor.",
    },
  ];

  return {
    resposta:
      "Perfeito, já tenho o que preciso! Montei um funil com 3 etapas e um agente pra cada uma — dá uma olhada e confirma se quiser criar assim.",
    concluido: true,
    proposta: { etapas, agentes },
  };
}
