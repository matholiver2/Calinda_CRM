import { prisma, comRetryConexao } from "@/lib/db";
import { enviarEAtualizarStatus } from "@/lib/conversationService";
import { resolverTextoConfiguravel } from "@/lib/mensagemConfiguravel";

const INTERVALO_PADRAO_DIAS = 30;
const TEMPLATE_PADRAO = "Oi, {nome}! Passando aqui pra saber se está tudo bem e se você precisa de mais alguma coisa da {empresa}. 😊";

async function intervaloFollowUpDaEmpresa(empresaId: string): Promise<number> {
  const config = await comRetryConexao(() =>
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId, chave: "followup_intervalo_dias" } },
    })
  );
  const dias = Number(config?.valor ?? INTERVALO_PADRAO_DIAS);
  return Number.isFinite(dias) && dias > 0 ? dias : INTERVALO_PADRAO_DIAS;
}

/**
 * Manda uma mensagem de follow-up pra um cliente (status "cliente") — check-in
 * periódico perguntando se está tudo bem, configurável em Configurar IA
 * (mensagem literal ou usada como base pra IA escrever, mesmo padrão das
 * outras mensagens automáticas). Diferente de remarketing/primeira
 * mensagem, não depende de Lead.iaAtiva — é relação pós-venda, não conduzida
 * pelo funil de automação.
 */
export async function enviarFollowUpCliente(leadId: string) {
  const lead = await comRetryConexao(() =>
    prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { empresa: true } })
  );
  if (lead.status !== "cliente") return null;

  const texto =
    (await resolverTextoConfiguravel({
      empresaId: lead.empresaId,
      chaveTemplate: "followup_mensagem_template",
      chaveModo: "followup_mensagem_modo",
      leadNome: lead.nome,
      empresaNome: lead.empresa.nome,
      persona: `Você representa a ${lead.empresa.nome}.`,
      tarefa: "uma mensagem de follow-up com um cliente, perguntando como está tudo e se ele precisa de mais alguma coisa",
    })) ??
    TEMPLATE_PADRAO.replaceAll("{nome}", lead.nome.split(" ")[0]).replaceAll("{empresa}", lead.empresa.nome);

  const mensagem = await comRetryConexao(() =>
    prisma.mensagem.create({
      data: { leadId: lead.id, remetente: "ia", conteudo: texto, statusEntrega: "enviado" },
    })
  );
  await enviarEAtualizarStatus(mensagem.id, lead.empresaId, lead.telefone, texto);

  // "Toca" o lead pra bater atualizadoEm de novo e resetar a contagem do intervalo.
  await comRetryConexao(() => prisma.lead.update({ where: { id: lead.id }, data: { iaAtiva: lead.iaAtiva } }));

  return mensagem;
}

/**
 * Roda periodicamente (src/instrumentation.ts + heartbeat do whatsapp-worker
 * via /api/cron/tick). Busca clientes cujo último contato já passou do
 * intervalo de follow-up configurado pela empresa e dispara uma mensagem
 * pra cada um.
 */
export async function pollFollowUpClientes(): Promise<void> {
  const leads = await comRetryConexao(() =>
    prisma.lead.findMany({
      where: { status: "cliente" },
      select: { id: true, empresaId: true, atualizadoEm: true },
    })
  );

  const intervalosPorEmpresa = new Map<string, number>();

  for (const lead of leads) {
    try {
      let intervaloDias = intervalosPorEmpresa.get(lead.empresaId);
      if (intervaloDias === undefined) {
        intervaloDias = await intervaloFollowUpDaEmpresa(lead.empresaId);
        intervalosPorEmpresa.set(lead.empresaId, intervaloDias);
      }

      const diasSemContato = (Date.now() - lead.atualizadoEm.getTime()) / 86_400_000;
      if (diasSemContato < intervaloDias) continue;

      await enviarFollowUpCliente(lead.id);
    } catch (err) {
      console.error("[followUpService] falha no follow-up do lead", lead.id, err);
    }
  }
}
