import { prisma, comRetryConexao } from "@/lib/db";
import { enviarEAtualizarStatus } from "@/lib/conversationService";
import { gerarMensagemComBase } from "@/lib/ai/engine";
import { criarNotificacao } from "@/lib/notificacoes";
import type { TipoFollowUp, ReguaFollowUp } from "@prisma/client";

function interpolar(texto: string, leadNome: string, empresaNome: string): string {
  return texto.replaceAll("{nome}", leadNome.split(" ")[0]).replaceAll("{empresa}", empresaNome);
}

/**
 * Motor da régua de relacionamento — diferente do follow-up simples por
 * intervalo fixo (followUpService.ts), aqui cada cliente classificado
 * (Lead.perfilFollowUp) segue uma régua de marcos no tempo (ReguaFollowUp),
 * contados a partir do início do contrato (Venda.contratoInicioEm) e
 * organizados por periodicidade (Venda.periodicidadeContrato). Cada marco
 * tem um TipoFollowUp: "automatico" manda a mensagem sozinho (literal ou
 * com IA), "manual" (ligação, visita — não dá pra automatizar de verdade)
 * vira uma notificação lembrando o vendedor, com o roteiro de apoio.
 *
 * Processa só UM marco por lead por ciclo do poller (o mais antigo ainda não
 * executado e já devido) — evita disparar vários de uma vez se o sistema
 * ficou um tempo parado, e vai alcançando a régua aos poucos.
 */
export async function pollReguaFollowUp(): Promise<void> {
  const leads = await comRetryConexao(() =>
    prisma.lead.findMany({
      where: { status: "cliente", perfilFollowUp: { not: null } },
      include: { empresa: { select: { nome: true } } },
    })
  );

  for (const lead of leads) {
    try {
      const venda = await comRetryConexao(() =>
        prisma.venda.findFirst({
          where: {
            leadId: lead.id,
            status: "confirmada",
            contratoInicioEm: { not: null },
            periodicidadeContrato: { not: null },
          },
          orderBy: { contratoInicioEm: "desc" },
        })
      );
      if (!venda?.contratoInicioEm || !venda.periodicidadeContrato || !lead.perfilFollowUp) continue;

      const diasDesdeInicio = Math.floor((Date.now() - venda.contratoInicioEm.getTime()) / 86_400_000);
      if (diasDesdeInicio < 0) continue;

      const reguas = await comRetryConexao(() =>
        prisma.reguaFollowUp.findMany({
          where: {
            empresaId: lead.empresaId,
            perfil: lead.perfilFollowUp!,
            periodicidade: venda.periodicidadeContrato!,
            diaOffset: { lte: diasDesdeInicio },
          },
          orderBy: { diaOffset: "asc" },
          include: { tipoFollowUp: true },
        })
      );

      for (const regua of reguas) {
        const jaExecutado = await comRetryConexao(() =>
          prisma.followUpReguaEnvio.findUnique({
            where: { leadId_reguaId: { leadId: lead.id, reguaId: regua.id } },
          })
        );
        if (jaExecutado) continue;

        await executarMarcoRegua(lead, regua);
        break; // só o próximo marco devido por ciclo
      }
    } catch (err) {
      console.error("[reguaFollowUpService] falha na régua do lead", lead.id, err);
    }
  }
}

async function executarMarcoRegua(
  lead: { id: string; empresaId: string; nome: string; telefone: string; empresa: { nome: string } },
  regua: ReguaFollowUp & { tipoFollowUp: TipoFollowUp }
) {
  const tipo = regua.tipoFollowUp;

  if (tipo.canal === "automatico") {
    const texto =
      tipo.modoEnvio === "ia"
        ? await gerarMensagemComBase({
            baseTexto: tipo.scriptModelo,
            tarefa: `uma mensagem de follow-up do tipo "${tipo.nome}"${tipo.objetivo ? ` (${tipo.objetivo})` : ""}`,
            leadNome: lead.nome,
            persona: `Você representa a ${lead.empresa.nome}.`,
          })
        : interpolar(tipo.scriptModelo, lead.nome, lead.empresa.nome);

    const mensagem = await prisma.mensagem.create({
      data: { leadId: lead.id, remetente: "ia", conteudo: texto, statusEntrega: "enviado" },
    });
    await enviarEAtualizarStatus(mensagem.id, lead.empresaId, lead.telefone, texto);
  } else {
    // Canal manual (ligação, visita) — não dá pra automatizar de verdade,
    // então vira um lembrete pro vendedor agir, com o roteiro como apoio.
    await criarNotificacao(lead.empresaId, {
      tipo: "regua_follow_up",
      titulo: `Follow-up devido: ${tipo.nome} — ${lead.nome}`,
      corpo: `${tipo.objetivo ? `${tipo.objetivo}\n\n` : ""}${tipo.scriptModelo}`,
      leadId: lead.id,
    });
  }

  await prisma.followUpReguaEnvio.create({
    data: { leadId: lead.id, reguaId: regua.id, tipoFollowUpId: tipo.id },
  });
}
