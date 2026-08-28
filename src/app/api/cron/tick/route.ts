import { NextResponse } from "next/server";
import { pollRespostasIaAgendadas } from "@/lib/conversationService";

/**
 * Disparador externo de tarefas em segundo plano — chamado periodicamente
 * pelo whatsapp-worker (processo persistente no Railway), já que um
 * setInterval dentro do próprio app Next.js não sobrevive de forma
 * confiável em produção serverless (Vercel congela/recicla a função entre
 * requisições). Ver src/lib/conversationService.ts::pollRespostasIaAgendadas.
 */
export async function POST(req: Request) {
  const secretEsperado = process.env.WHATSAPP_WORKER_SECRET;
  if (secretEsperado && req.headers.get("x-worker-secret") !== secretEsperado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    await pollRespostasIaAgendadas();
  } catch (err) {
    console.error("[cron/tick] erro ao processar respostas de IA agendadas:", err);
  }

  return NextResponse.json({ ok: true });
}
