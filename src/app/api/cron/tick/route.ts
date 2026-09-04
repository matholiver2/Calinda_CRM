import { NextResponse } from "next/server";
import { pollRespostasIaAgendadas } from "@/lib/conversationService";
import { pollLimparAssistente } from "@/lib/assistenteHistorico";
import { pollRemarketing } from "@/lib/remarketingService";
import { pollFollowUpClientes } from "@/lib/followUpService";

/**
 * Disparador externo de tarefas em segundo plano — chamado periodicamente
 * pelo whatsapp-worker (processo persistente no Railway), já que um
 * setInterval dentro do próprio app Next.js não sobrevive de forma
 * confiável em produção serverless (Vercel congela/recicla a função entre
 * requisições). Ver src/lib/conversationService.ts::pollRespostasIaAgendadas.
 */

const LIMPEZA_ASSISTENTE_INTERVALO_MS = 6 * 60 * 60_000; // não precisa rodar a cada tick
const REMARKETING_INTERVALO_MS = 60 * 60_000; // intervalo é medido em dias, checar toda hora já sobra
const FOLLOWUP_INTERVALO_MS = 60 * 60_000;
// Piso mesmo pra resposta de IA (a única que roda a cada tick) — segurança
// extra contra excesso de conexão no Postgres se o heartbeat do worker
// ficar mais frequente de novo no futuro, ou se dois ticks se sobrepuserem.
const RESPOSTA_IA_INTERVALO_MINIMO_MS = 15_000;
let ultimaLimpezaAssistente = 0;
let ultimoRemarketing = 0;
let ultimoFollowUp = 0;
let ultimaRespostaIa = 0;

export async function POST(req: Request) {
  const secretEsperado = process.env.WHATSAPP_WORKER_SECRET;
  if (secretEsperado && req.headers.get("x-worker-secret") !== secretEsperado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  if (Date.now() - ultimaRespostaIa > RESPOSTA_IA_INTERVALO_MINIMO_MS) {
    ultimaRespostaIa = Date.now();
    try {
      await pollRespostasIaAgendadas();
    } catch (err) {
      console.error("[cron/tick] erro ao processar respostas de IA agendadas:", err);
    }
  }

  if (Date.now() - ultimoRemarketing > REMARKETING_INTERVALO_MS) {
    ultimoRemarketing = Date.now();
    try {
      await pollRemarketing();
    } catch (err) {
      console.error("[cron/tick] erro ao processar remarketing:", err);
    }
  }

  if (Date.now() - ultimoFollowUp > FOLLOWUP_INTERVALO_MS) {
    ultimoFollowUp = Date.now();
    try {
      await pollFollowUpClientes();
    } catch (err) {
      console.error("[cron/tick] erro ao processar follow-up de clientes:", err);
    }
  }

  if (Date.now() - ultimaLimpezaAssistente > LIMPEZA_ASSISTENTE_INTERVALO_MS) {
    ultimaLimpezaAssistente = Date.now();
    try {
      await pollLimparAssistente();
    } catch (err) {
      console.error("[cron/tick] erro ao limpar mensagens antigas do Assistente:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
