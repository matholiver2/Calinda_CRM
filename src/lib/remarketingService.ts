import { prisma, comRetryConexao } from "@/lib/db";
import { gerarReengajamento } from "@/lib/ai/engine";
import { enviarEAtualizarStatus } from "@/lib/conversationService";
import { criarNotificacao } from "@/lib/notificacoes";

const INTERVALO_PADRAO_DIAS = 3;

async function intervaloDiasDaEmpresa(empresaId: string): Promise<number> {
  const config = await comRetryConexao(() =>
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId, chave: "remarketing_intervalo_dias" } },
    })
  );
  const dias = Number(config?.valor ?? INTERVALO_PADRAO_DIAS);
  return Number.isFinite(dias) && dias > 0 ? dias : INTERVALO_PADRAO_DIAS;
}

/**
 * Gera e envia uma mensagem de reengajamento pra um lead em remarketing —
 * usado tanto pelo poller automático quanto pelo botão manual "Reengajar
 * agora". Reaproveita o mesmo agente vinculado à etapa de remarketing do
 * lead (etapaAtualId já aponta pra ela, ver POST /api/reunioes/[id]).
 */
export async function enviarReengajamentoRemarketing(leadId: string) {
  const lead = await comRetryConexao(() => prisma.lead.findUniqueOrThrow({ where: { id: leadId } }));
  if (lead.status !== "remarketing" || !lead.iaAtiva) return null;

  const agente = await comRetryConexao(() =>
    prisma.agenteIa.findFirst({ where: { etapaId: lead.etapaAtualId, ativo: true } })
  );

  const historicoRows = await comRetryConexao(() =>
    prisma.mensagem.findMany({ where: { leadId: lead.id }, orderBy: { enviadoEm: "asc" }, take: 30 })
  );
  const historico = historicoRows.map((m) => ({ remetente: m.remetente, conteudo: m.conteudo }));

  const diasSemContato = Math.floor((Date.now() - lead.atualizadoEm.getTime()) / 86_400_000);

  const decisao = await gerarReengajamento({
    leadNome: lead.nome,
    persona: agente?.persona ?? "Você representa uma empresa de tecnologia B2B.",
    objetivo: agente?.objetivo ?? "Reconquistar o lead e reativar o interesse dele.",
    historico,
    diasSemContato,
  });

  const mensagem = await comRetryConexao(() =>
    prisma.mensagem.create({
      data: { leadId: lead.id, remetente: "ia", conteudo: decisao.mensagem, statusEntrega: "enviado" },
    })
  );
  await enviarEAtualizarStatus(mensagem.id, lead.empresaId, lead.telefone, decisao.mensagem);

  if (decisao.desistir) {
    await comRetryConexao(() =>
      prisma.lead.update({ where: { id: lead.id }, data: { status: "perdido", iaAtiva: false } })
    );
    void criarNotificacao(lead.empresaId, {
      tipo: "conversa_mudou_etapa",
      titulo: `${lead.nome} saiu do remarketing`,
      corpo: "A IA desistiu de reengajar — o lead pediu para não ser mais contatado.",
      leadId: lead.id,
    });
  } else {
    // "Toca" o lead pra bater atualizadoEm de novo e resetar a contagem do intervalo.
    await comRetryConexao(() => prisma.lead.update({ where: { id: lead.id }, data: { iaAtiva: lead.iaAtiva } }));
  }

  return mensagem;
}

/**
 * Roda a cada 5min (src/instrumentation.ts). Busca leads em remarketing cujo
 * último contato já passou do intervalo configurado pela empresa e dispara
 * um novo ciclo de reengajamento pra cada um.
 */
export async function pollRemarketing(): Promise<void> {
  const leads = await comRetryConexao(() =>
    prisma.lead.findMany({
      where: { status: "remarketing", iaAtiva: true },
      select: { id: true, empresaId: true, atualizadoEm: true },
    })
  );

  const intervalosPorEmpresa = new Map<string, number>();

  for (const lead of leads) {
    try {
      let intervaloDias = intervalosPorEmpresa.get(lead.empresaId);
      if (intervaloDias === undefined) {
        intervaloDias = await intervaloDiasDaEmpresa(lead.empresaId);
        intervalosPorEmpresa.set(lead.empresaId, intervaloDias);
      }

      const diasSemContato = (Date.now() - lead.atualizadoEm.getTime()) / 86_400_000;
      if (diasSemContato < intervaloDias) continue;

      await enviarReengajamentoRemarketing(lead.id);
    } catch (err) {
      console.error("[remarketingService] falha no reengajamento do lead", lead.id, err);
    }
  }
}
