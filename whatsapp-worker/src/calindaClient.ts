import { env } from "./env.js";

/**
 * Chamadas de volta para o app CALINDA: mensagem recebida (reaproveita o
 * webhook existente) e mudança de status da sessão.
 */

export async function encaminharMensagemRecebida(params: {
  empresaId: string;
  telefone: string;
  texto: string;
  nome?: string;
}): Promise<void> {
  try {
    const res = await fetch(`${env.calindaBaseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-worker-secret": env.workerSecret },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error(`[calindaClient] webhook respondeu ${res.status} para empresa ${params.empresaId}`);
    }
  } catch (err) {
    console.error("[calindaClient] falha ao encaminhar mensagem recebida:", err);
  }
}

/**
 * "Batimento cardíaco" pro app CALINDA — dispara tarefas em segundo plano
 * que dependem de tempo (resposta da IA agendada, hoje) e que um
 * setTimeout/setInterval dentro do Next.js na Vercel não executa de forma
 * confiável (função serverless congela/recicla entre requisições). Este
 * worker roda como processo persistente (Railway), então é ele quem garante
 * que o tick acontece de verdade a cada poucos segundos.
 */
export async function dispararTick(): Promise<void> {
  try {
    const res = await fetch(`${env.calindaBaseUrl}/api/cron/tick`, {
      method: "POST",
      headers: { "x-worker-secret": env.workerSecret },
    });
    if (!res.ok) {
      console.error(`[calindaClient] /api/cron/tick respondeu ${res.status}`);
    }
  } catch (err) {
    console.error("[calindaClient] falha ao disparar tick:", err);
  }
}

export async function reportarStatus(params: {
  empresaId: string;
  status: "desconectado" | "conectando" | "conectado";
  numeroConectado?: string | null;
}): Promise<void> {
  try {
    const res = await fetch(`${env.calindaBaseUrl}/api/whatsapp/webhook-status`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-worker-secret": env.workerSecret },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error(`[calindaClient] webhook-status respondeu ${res.status} para empresa ${params.empresaId}`);
    }
  } catch (err) {
    console.error("[calindaClient] falha ao reportar status:", err);
  }
}
