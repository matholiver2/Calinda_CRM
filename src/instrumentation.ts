// Hook oficial do Next.js — roda uma vez quando o servidor sobe. Usado aqui
// pra manter o Google Calendar sincronizado nos dois sentidos, disparar
// remarketing automático e lembretes de reunião, sem precisar de
// infraestrutura de fila/cron: o processo Next.js já é de longa duração
// (não é serverless), então um setInterval em memória resolve.

const POLL_INTERVAL_MS = 5 * 60_000;
const LEMBRETE_INTERVAL_MS = 2 * 60_000;

declare global {
  var __calindaGoogleCalendarPollStarted: boolean | undefined;
  var __calindaRemarketingPollStarted: boolean | undefined;
  var __calindaLembretesPollStarted: boolean | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // não roda no edge runtime

  if (!globalThis.__calindaGoogleCalendarPollStarted) {
    globalThis.__calindaGoogleCalendarPollStarted = true;
    const { pollGoogleCalendars } = await import("@/lib/googleCalendarSync");
    setInterval(() => {
      pollGoogleCalendars().catch((err) => {
        console.error("[instrumentation] erro no polling do Google Calendar:", err);
      });
    }, POLL_INTERVAL_MS);
    console.log("[instrumentation] polling do Google Calendar ativo (a cada 5 min)");
  }

  if (!globalThis.__calindaRemarketingPollStarted) {
    globalThis.__calindaRemarketingPollStarted = true;
    const { pollRemarketing } = await import("@/lib/remarketingService");
    setInterval(() => {
      pollRemarketing().catch((err) => {
        console.error("[instrumentation] erro no polling de remarketing:", err);
      });
    }, POLL_INTERVAL_MS);
    console.log("[instrumentation] polling de remarketing ativo (a cada 5 min)");
  }

  if (!globalThis.__calindaLembretesPollStarted) {
    globalThis.__calindaLembretesPollStarted = true;
    const { pollLembretesReuniao } = await import("@/lib/lembretesReuniao");
    setInterval(() => {
      pollLembretesReuniao().catch((err) => {
        console.error("[instrumentation] erro no polling de lembretes de reunião:", err);
      });
    }, LEMBRETE_INTERVAL_MS);
    console.log("[instrumentation] polling de lembretes de reunião ativo (a cada 2 min)");
  }
}
