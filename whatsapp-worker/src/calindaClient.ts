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
