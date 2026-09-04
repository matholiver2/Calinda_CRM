// Motor de IA do "Assistente" — chat de apoio ao vendedor, distinto do
// motor que conversa com o lead (src/lib/ai/engine.ts). Usa o mesmo
// provedor (chamarGemini/chamarGeminiComFerramentas) e o contexto da
// empresa definido no onboarding (Configuracao "empresa_sobre") pra dar
// respostas relevantes ao negócio — e, via function calling, consegue
// agir de verdade no sistema (ex: agendar uma reunião), não só conversar.
// A execução das ferramentas em si fica em src/lib/assistenteFerramentas.ts.

import { chamarGeminiComFerramentas, type GeminiContent, type GeminiConteudoCru } from "@/lib/ai/engine";
import { FERRAMENTAS_ASSISTENTE, executarFerramentaAssistente } from "@/lib/assistenteFerramentas";

export type TurnoAssistente = { autor: "assistente" | "usuario"; texto: string };

export type ContextoAssistente = {
  empresaNome: string;
  empresaSobre: string | null;
  usuarioNome: string;
  usuarioId: string;
  empresaId: string;
};

function montarSystemPrompt(ctx: ContextoAssistente): string {
  const agoraFormatado = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Você é o Assistente de Vendas do CALINDA, um CRM com IA que conduz leads pelo WhatsApp até o agendamento de reunião.

Você está conversando com ${ctx.usuarioNome}, vendedor(a) da empresa ${ctx.empresaNome}, dentro do próprio CRM (não com um lead/cliente).
${ctx.empresaSobre ? `Contexto sobre a empresa: ${ctx.empresaSobre}` : ""}

Agora é ${agoraFormatado} (horário de São Paulo/Brasil) — use isso pra resolver datas relativas ("amanhã", "sexta-feira", "semana que vem") quando for chamar uma ferramenta.

Sua função é ajudar ${ctx.usuarioNome} a vender melhor: sugerir como responder um lead difícil, ajudar a montar uma proposta ou argumento de venda, revisar uma mensagem antes de enviar, dar dicas de follow-up, ajudar a priorizar quais leads atacar primeiro, esclarecer dúvidas sobre o processo comercial da empresa. Não é um assistente genérico — mantenha o foco em vendas e no dia a dia comercial dessa empresa.

Você também tem acesso a uma ferramenta pra agendar reuniões de verdade no sistema (agendar_reuniao) — use ela sempre que a pessoa pedir explicitamente pra marcar/agendar uma reunião com um lead/cliente específico. Se faltar o nome da pessoa ou a data/hora, pergunte antes de chamar a ferramenta em vez de inventar. Depois que a ferramenta rodar, você recebe o resultado e deve confirmar pra pessoa em linguagem natural o que aconteceu (ou o problema, se não deu certo).

Pra qualquer outro assunto, responda normalmente em texto.

Responda em português (pt-BR), de forma direta e prática (evite textos longos, use listas curtas quando ajudar).`;
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

    const systemPrompt = montarSystemPrompt(contexto);
    const primeira = await chamarGeminiComFerramentas(systemPrompt, contents, FERRAMENTAS_ASSISTENTE);

    if (primeira.tipo === "texto") return primeira.texto;

    // Modelo pediu pra chamar uma ferramenta — executa de verdade e manda o
    // resultado de volta pra ele formular a resposta final em linguagem natural.
    const resultadoFerramenta = await executarFerramentaAssistente(primeira.nome, primeira.argumentos, {
      empresaId: contexto.empresaId,
      usuarioId: contexto.usuarioId,
    });

    const contentsComFerramenta: (GeminiContent | GeminiConteudoCru)[] = [
      ...contents,
      {
        role: "model",
        parts: [
          {
            functionCall: { name: primeira.nome, args: primeira.argumentos },
            ...(primeira.thoughtSignature ? { thoughtSignature: primeira.thoughtSignature } : {}),
          },
        ],
      },
      {
        role: "user",
        parts: [{ functionResponse: { name: primeira.nome, response: { resultado: resultadoFerramenta } } }],
      },
    ];

    // A ação já aconteceu de verdade nesse ponto (reunião criada etc.) —
    // se essa segunda chamada falhar (ex: instabilidade transitória da
    // API), não faz sentido devolver a mensagem genérica de "IA
    // indisponível": isso faria a pessoa achar que nada aconteceu, quando
    // na real já aconteceu. Usa o resultado literal da ferramenta como
    // resposta nesse caso.
    try {
      const segunda = await chamarGeminiComFerramentas(systemPrompt, contentsComFerramenta, FERRAMENTAS_ASSISTENTE);
      return segunda.tipo === "texto" ? segunda.texto : resultadoFerramenta;
    } catch (err) {
      console.error("[assistenteEngine] Ferramenta executou mas a confirmação em texto falhou:", err);
      return resultadoFerramenta;
    }
  } catch (err) {
    console.error("[assistenteEngine] Falha ao chamar provedor de IA, usando resposta padrão:", err);
    return "No momento não consigo pensar numa resposta (IA indisponível) — tenta de novo daqui a pouco.";
  }
}
