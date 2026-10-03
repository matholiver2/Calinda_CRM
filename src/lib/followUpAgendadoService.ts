import { prisma, comRetryConexao } from "@/lib/db";
import { enviarEAtualizarStatus } from "@/lib/conversationService";
import { gerarReengajamento } from "@/lib/ai/engine";

/**
 * Processa follow-ups manuais agendados pontualmente a partir da tela da
 * conversa (presets "em 1h/3h/amanhã" ou data customizada — ver
 * POST /api/leads/[id]/follow-ups). Roda no mesmo ciclo rápido do polling de
 * resposta de IA (ver src/instrumentation.ts e /api/cron/tick), já que aqui
 * o horário escolhido pelo vendedor importa de verdade.
 *
 * "Reivindica" cada linha com um update atômico status pendente→enviado
 * ANTES de mandar de fato (mesma ideia do CAS em
 * conversationService.ts::pollRespostasIaAgendadas) — evita duplicar o envio
 * se dois pollers rodarem quase ao mesmo tempo. Se o envio falhar depois, a
 * linha é corrigida pra "falhou".
 */
export async function pollFollowUpsAgendados(): Promise<void> {
  const agora = new Date();
  const pendentes = await comRetryConexao(() =>
    prisma.followUpAgendado.findMany({
      where: { status: "pendente", enviarEm: { lte: agora } },
      take: 20,
      orderBy: { enviarEm: "asc" },
    })
  );

  for (const followUp of pendentes) {
    const { count } = await comRetryConexao(() =>
      prisma.followUpAgendado.updateMany({
        where: { id: followUp.id, status: "pendente" },
        data: { status: "enviado", enviadoEm: new Date() },
      })
    );
    if (count === 0) continue; // outro poller já reivindicou

    try {
      await processarFollowUp(followUp.id, followUp.leadId, followUp.textoPersonalizado);
    } catch (err) {
      console.error("[followUpAgendadoService] falha ao enviar follow-up", followUp.id, err);
      await comRetryConexao(() =>
        prisma.followUpAgendado.update({
          where: { id: followUp.id },
          data: { status: "falhou", erro: err instanceof Error ? err.message.slice(0, 300) : "Erro desconhecido" },
        })
      );
    }
  }
}

async function processarFollowUp(followUpId: string, leadId: string, textoPersonalizado: string | null) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { empresa: true } });

  let texto = textoPersonalizado;
  if (!texto) {
    const historicoRows = await prisma.mensagem.findMany({
      where: { leadId },
      orderBy: { enviadoEm: "asc" },
      take: 30,
    });
    const diasSemContato = Math.max(
      0,
      Math.round((Date.now() - lead.atualizadoEm.getTime()) / 86_400_000)
    );
    const decisao = await gerarReengajamento({
      leadNome: lead.nome,
      persona: `Você representa a ${lead.empresa.nome}.`,
      objetivo: "Reengajar o lead e entender se ainda há interesse.",
      historico: historicoRows.map((m) => ({ remetente: m.remetente, conteudo: m.conteudo })),
      diasSemContato,
    });
    texto = decisao.mensagem;
  }

  const mensagem = await prisma.mensagem.create({
    data: { leadId, remetente: "ia", conteudo: texto, statusEntrega: "enviado" },
  });
  const resultado = await enviarEAtualizarStatus(mensagem.id, lead.empresaId, lead.telefone, texto);

  if (resultado.status === "falhou") {
    await prisma.followUpAgendado.update({
      where: { id: followUpId },
      data: { status: "falhou", erro: "Falha ao enviar pelo WhatsApp" },
    });
  }
}
