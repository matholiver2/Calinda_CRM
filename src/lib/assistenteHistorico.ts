import { prisma } from "@/lib/db";
import type { TurnoAssistente } from "@/lib/ai/assistenteEngine";

const RETENCAO_DIAS = 30;

export async function carregarHistoricoAssistente(usuarioId: string, empresaId: string): Promise<TurnoAssistente[]> {
  const desde = new Date(Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000);
  const mensagens = await prisma.assistenteMensagem.findMany({
    where: { usuarioId, empresaId, criadoEm: { gte: desde } },
    orderBy: { criadoEm: "asc" },
  });
  return mensagens.map((m) => ({ autor: m.autor as TurnoAssistente["autor"], texto: m.conteudo }));
}

export async function salvarTurnoAssistente(
  usuarioId: string,
  empresaId: string,
  autor: TurnoAssistente["autor"],
  texto: string
) {
  await prisma.assistenteMensagem.create({ data: { usuarioId, empresaId, autor, conteudo: texto } });
}

/** Apaga mensagens com mais de 30 dias — chamado pelo poller local e pelo heartbeat do whatsapp-worker (ver /api/cron/tick). */
export async function pollLimparAssistente() {
  const limite = new Date(Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000);
  await prisma.assistenteMensagem.deleteMany({ where: { criadoEm: { lt: limite } } });
}
