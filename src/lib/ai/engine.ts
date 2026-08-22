// Motor de automação/IA do CALINDA.
//
// Recebe o contexto da conversa (persona/objetivo do agente da etapa atual,
// histórico de mensagens e dados do lead) e devolve: texto de resposta +
// decisão estruturada de transição de etapa — conforme seção 6.2 do
// descritivo técnico.
//
// Se GEMINI_API_KEY estiver definido, usa a API do Google Gemini.
// Caso contrário, cai em um simulador local baseado em regras (modo demo),
// permitindo rodar e demonstrar o fluxo completo sem credenciais externas.

export type MensagemContexto = {
  remetente: "lead" | "ia" | "vendedor";
  conteudo: string;
};

export type AiEngineInput = {
  leadNome: string;
  etapaNome: string;
  etapaOrdem: number;
  persona: string;
  objetivo: string;
  historico: MensagemContexto[];
  mensagemRecebida: string;
};

export type AiDecision = {
  resposta: string;
  avancarEtapa: boolean;
  motivoTransicao: string;
  marcarPerdido: boolean;
  sugerirReuniao: boolean;
  /** Data/hora que o lead pediu pra reunião, se ele mencionou uma (ISO 8601). Null se não especificou. */
  dataHoraSugerida: string | null;
};

const GEMINI_MODEL = "gemini-3.6-flash";

export type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

/**
 * Chamada crua ao Gemini, forçando saída em JSON — compartilhada pelo motor
 * de vendas (abaixo) e pelo motor de onboarding (src/lib/ai/onboardingEngine.ts).
 * Lança erro se não houver GEMINI_API_KEY ou se a chamada falhar; quem chama
 * decide o fallback (cada motor tem o próprio simulador local).
 */
export async function chamarGemini(
  systemPrompt: string,
  contents: GeminiContent[]
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API respondeu ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text.trim());
}

export async function gerarResposta(input: AiEngineInput): Promise<AiDecision> {
  try {
    return await gerarComGemini(input);
  } catch (err) {
    console.error("[ai/engine] Falha ao chamar provedor de IA, usando simulador:", err);
    return simular(input);
  }
}

async function gerarComGemini(input: AiEngineInput): Promise<AiDecision> {
  const agora = new Date();
  const agoraFormatado = agora.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const systemPrompt = `Você é um agente de IA de vendas dentro de um CRM chamado CALINDA.
Persona/empresa: ${input.persona}
Objetivo nesta etapa ("${input.etapaNome}"): ${input.objetivo}

Agora é ${agoraFormatado} (horário de São Paulo/Brasil).

Converse naturalmente em português (pt-BR), de forma breve (1-3 frases, tom de WhatsApp),
e decida se o lead deve avançar de etapa.

Se o lead pedir ou aceitar marcar uma reunião (sugerir_reuniao=true), preste muita atenção em
qualquer dia/horário que ele tenha mencionado (ex: "amanhã de manhã", "sexta às 15h", "dia 20 às
10h") e calcule a data/hora exata (sempre no futuro em relação a agora, use a data acima como
referência pra resolver dias relativos como "amanhã" ou "segunda"). Coloque o resultado em
data_hora_sugerida no formato ISO 8601 com horário (ex: "2025-06-20T15:00:00-03:00"). Se o lead
NÃO mencionou nenhum dia/horário específico, retorne data_hora_sugerida como null (não invente
um horário).

Responda SOMENTE em JSON válido, no formato:
{"resposta": string, "avancar_etapa": boolean, "motivo_transicao": string, "marcar_perdido": boolean, "sugerir_reuniao": boolean, "data_hora_sugerida": string | null}`;

  // Gemini usa "user"/"model" em vez de "user"/"assistant"; respostas da IA
  // ou do vendedor entram como "model" (do ponto de vista do lead, ambas são
  // a "outra parte" da conversa).
  const contents: GeminiContent[] = [
    ...input.historico.map((m) => ({
      role: m.remetente === "lead" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.conteudo }],
    })),
    { role: "user" as const, parts: [{ text: input.mensagemRecebida }] },
  ];

  const parsed = await chamarGemini(systemPrompt, contents);

  return {
    resposta: String(parsed.resposta ?? "Certo, obrigado pela resposta!"),
    avancarEtapa: Boolean(parsed.avancar_etapa),
    motivoTransicao: String(parsed.motivo_transicao ?? "decisao_ia"),
    marcarPerdido: Boolean(parsed.marcar_perdido),
    sugerirReuniao: Boolean(parsed.sugerir_reuniao),
    dataHoraSugerida: typeof parsed.data_hora_sugerida === "string" ? parsed.data_hora_sugerida : null,
  };
}

export type ReengajamentoInput = {
  leadNome: string;
  persona: string;
  objetivo: string;
  historico: MensagemContexto[];
  diasSemContato: number;
};

export type ReengajamentoDecisao = {
  mensagem: string;
  desistir: boolean;
};

/**
 * Motor de remarketing: diferente de gerarResposta (reage a uma mensagem do
 * lead), aqui a IA puxa a conversa de novo depois de dias sem contato —
 * revê o histórico e decide o que oferecer, ou desiste se o lead já deixou
 * claro que não quer mais ser contatado.
 */
export async function gerarReengajamento(input: ReengajamentoInput): Promise<ReengajamentoDecisao> {
  try {
    return await gerarReengajamentoComGemini(input);
  } catch (err) {
    console.error("[ai/engine] Falha ao chamar provedor de IA (reengajamento), usando simulador:", err);
    return simularReengajamento(input);
  }
}

async function gerarReengajamentoComGemini(input: ReengajamentoInput): Promise<ReengajamentoDecisao> {
  const systemPrompt = `Você é um agente de IA de remarketing dentro de um CRM chamado CALINDA.
Persona/empresa: ${input.persona}
Objetivo: ${input.objetivo}

Esse lead já conversou antes mas não fechou negócio, e faz ${input.diasSemContato} dia(s) que
ninguém fala com ele. Releia o histórico abaixo e escreva uma mensagem breve (1-3 frases, tom de
WhatsApp) pra reengajar — traga uma oferta, novidade ou pergunta relacionada ao que já foi
conversado (não seja genérico, use o contexto real da conversa). Se o histórico mostrar que o
lead já pediu explicitamente para não ser mais contatado ou recusou de forma definitiva, não
insista: nesse caso escreva uma mensagem curta de despedida e marque desistir=true.

Responda SOMENTE em JSON válido, no formato:
{"mensagem": string, "desistir": boolean}`;

  const contents: GeminiContent[] = input.historico.map((m) => ({
    role: m.remetente === "lead" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.conteudo }],
  }));

  const parsed = await chamarGemini(systemPrompt, contents);

  return {
    mensagem: String(parsed.mensagem ?? "Oi! Passando pra saber se ainda tem interesse — posso te ajudar com algo?"),
    desistir: Boolean(parsed.desistir),
  };
}

function simularReengajamento(input: ReengajamentoInput): ReengajamentoDecisao {
  const nome = input.leadNome.split(" ")[0];
  const ultimaDoLead = [...input.historico].reverse().find((m) => m.remetente === "lead");
  const msg = (ultimaDoLead?.conteudo ?? "").toLowerCase();
  const negativo = PALAVRAS_NEGATIVAS.some((p) => msg.includes(p));

  if (negativo) {
    return {
      mensagem: "Sem problemas, obrigado pelo retorno! Vou deixar de te enviar mensagens por aqui. 🙂",
      desistir: true,
    };
  }

  return {
    mensagem: `Oi, ${nome}! Passando aqui de novo — ainda faz sentido pra você a gente conversar sobre aquilo? Tenho novidades que podem te interessar.`,
    desistir: false,
  };
}

// --- Simulador local (modo demo, sem custo/latência de API externa) ---

const PALAVRAS_NEGATIVAS = [
  "não tenho interesse",
  "nao tenho interesse",
  "não quero",
  "nao quero",
  "para de mandar",
  "pare de mandar",
  "remove meu",
  "remover meu",
  "descadastrar",
  "sem interesse",
];

const PALAVRAS_AGENDAMENTO = [
  "pode ser",
  "fechado",
  "combinado",
  "vamos marcar",
  "quero agendar",
  "topo",
  "beleza, marca",
  "às 10",
  "as 10",
  "segunda",
  "terça",
  "terca",
  "quarta",
  "quinta",
  "sexta",
];

const RESPOSTAS_POR_ETAPA: Record<number, string[]> = {
  1: [
    "Oi, {nome}! Tudo bem? Vi que você se interessou por uma solução para o seu negócio — posso te fazer 2 perguntas rápidas pra te ajudar melhor?",
    "Olá, {nome}! Que bom falar com você. Me conta rapidinho: qual é o principal desafio que você quer resolver hoje?",
  ],
  2: [
    "Entendi! E hoje vocês já usam alguma ferramenta pra isso, ou seria o primeiro contato com esse tipo de solução?",
    "Perfeito, {nome}. Isso ajuda bastante. Qual o tamanho do time envolvido nesse processo hoje?",
  ],
  3: [
    "Faz total sentido pro que vocês precisam. Consigo te mostrar isso funcionando numa reunião rápida de 20 minutos — prefere de manhã ou à tarde?",
    "Show! Acho que temos um bom encaixe. Que tal marcarmos uma conversa rápida com um dos nossos consultores essa semana?",
  ],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function simular(input: AiEngineInput): AiDecision {
  const msg = input.mensagemRecebida.toLowerCase();
  const seed = seedFromString(input.mensagemRecebida + input.leadNome);

  const negativo = PALAVRAS_NEGATIVAS.some((p) => msg.includes(p));
  if (negativo) {
    return {
      resposta:
        "Sem problemas, obrigado pelo retorno! Vou deixar de te enviar mensagens por aqui. Se mudar de ideia, é só chamar. 🙂",
      avancarEtapa: false,
      motivoTransicao: "lead_recusou",
      marcarPerdido: true,
      sugerirReuniao: false,
      dataHoraSugerida: null,
    };
  }

  const querAgendar = PALAVRAS_AGENDAMENTO.some((p) => msg.includes(p));
  if (querAgendar) {
    return {
      resposta:
        "Perfeito! Já vou registrar aqui e um dos nossos consultores confirma o horário com você em instantes. Até já!",
      avancarEtapa: true,
      motivoTransicao: "lead_aceitou_reuniao",
      marcarPerdido: false,
      sugerirReuniao: true,
      dataHoraSugerida: null,
    };
  }

  const mensagensDoLeadNaEtapa = input.historico.filter((m) => m.remetente === "lead").length;
  const respostasDisponiveis = RESPOSTAS_POR_ETAPA[input.etapaOrdem] ?? RESPOSTAS_POR_ETAPA[3];
  const resposta = pick(respostasDisponiveis, seed).replace("{nome}", input.leadNome.split(" ")[0]);

  // Após 2 trocas de mensagem nessa etapa, o simulador considera que houve
  // qualificação suficiente para avançar — imita o "conversa livre até decidir avançar".
  const avancarEtapa = mensagensDoLeadNaEtapa >= 2;

  return {
    resposta,
    avancarEtapa,
    motivoTransicao: avancarEtapa ? "qualificacao_atingida" : "conversa_em_andamento",
    marcarPerdido: false,
    sugerirReuniao: false,
    dataHoraSugerida: null,
  };
}
