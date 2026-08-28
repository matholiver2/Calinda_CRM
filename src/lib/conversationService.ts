import { prisma, comRetryConexao } from "@/lib/db";
import { gerarResposta } from "@/lib/ai/engine";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { sincronizarReuniaoComGoogle } from "@/lib/googleCalendarSync";
import { criarNotificacao } from "@/lib/notificacoes";

const REUNIAO_DIAS_A_FRENTE = 2;

// A IA não responde na hora — espera um tempo aleatório (parece mais humano
// e evita que o lead perceba um robô respondendo instantaneamente). O tempo
// varia a cada mensagem, nunca é fixo.
const RESPOSTA_IA_DELAY_MIN_MS = 60_000;
const RESPOSTA_IA_DELAY_MAX_MS = 3 * 60_000;

function delayAleatorioRespostaIa(): number {
  return RESPOSTA_IA_DELAY_MIN_MS + Math.random() * (RESPOSTA_IA_DELAY_MAX_MS - RESPOSTA_IA_DELAY_MIN_MS);
}

const DURACAO_REUNIAO_MIN = 60;

/** Valida a data/hora que a IA extraiu da conversa — só aceita se for uma data real no futuro. */
function dataFuturaValida(iso: string | null): Date | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime()) || data.getTime() <= Date.now()) return null;
  return data;
}

/**
 * Evita marcar 2 reuniões do mesmo vendedor no mesmo horário: se já existe
 * uma reunião (de outro lead) desse vendedor dentro da duração padrão do
 * horário desejado, empurra em blocos de 30min até achar um horário livre.
 */
async function proximoHorarioLivre(vendedorId: string, desejado: Date): Promise<Date> {
  let candidato = new Date(desejado);
  for (let tentativa = 0; tentativa < 16; tentativa++) {
    const inicio = candidato;
    const fim = new Date(candidato.getTime() + DURACAO_REUNIAO_MIN * 60_000);
    const conflito = await prisma.reuniao.findFirst({
      where: {
        vendedorId,
        status: { in: ["agendada", "confirmada"] },
        dataHora: { gte: new Date(inicio.getTime() - DURACAO_REUNIAO_MIN * 60_000), lt: fim },
      },
    });
    if (!conflito) return candidato;
    candidato = new Date(candidato.getTime() + 30 * 60_000);
  }
  return candidato;
}

async function escolherVendedor(empresaId: string) {
  return prisma.usuario.findFirst({
    where: { empresaId, papel: "vendedor", ativo: true },
    orderBy: { criadoEm: "asc" },
  });
}

/**
 * Envia a mensagem já persistida (statusEntrega "enviado" otimista) e
 * corrige pra "falhou" se o provedor não conseguir entregar de verdade —
 * sem isso, uma falha de envio (ex: WhatsApp reconectando) ficava invisível:
 * a mensagem aparecia "enviada" no CRM mesmo sem nunca ter saído.
 */
export async function enviarEAtualizarStatus(mensagemId: string, empresaId: string, telefone: string, texto: string) {
  const provider = await getWhatsAppProvider(empresaId);
  const resultado = await provider.enviarMensagem(telefone, texto);
  if (resultado.status === "falhou") {
    await prisma.mensagem.update({ where: { id: mensagemId }, data: { statusEntrega: "falhou" } });
    console.error(`[conversationService] falha ao enviar mensagem ${mensagemId} pro WhatsApp`);
  }
  return resultado;
}

/**
 * Processa uma mensagem recebida de um lead: persiste a mensagem na hora e
 * agenda a resposta da IA para daqui a 1-3 minutos (ver responderComIa).
 *
 * O agendamento é salvo no banco (Lead.respostaIaAgendadaPara), não num
 * setTimeout em memória — um setTimeout não sobrevive entre invocações de
 * função serverless (Vercel encerra/congela o processo depois da resposta
 * HTTP), o que fazia a IA nunca responder em produção. Quem efetivamente
 * dispara a resposta quando chega a hora é pollRespostasIaAgendadas,
 * chamada tanto pelo poller local (instrumentation.ts, útil em dev/processo
 * de longa duração) quanto pelo heartbeat do whatsapp-worker — esse sim um
 * processo persistente de verdade — batendo em /api/cron/tick.
 */
export async function processarMensagemRecebida(leadId: string, textoRecebido: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { etapaAtual: true },
  });

  const mensagemRecebida = await prisma.mensagem.create({
    data: { leadId: lead.id, remetente: "lead", conteudo: textoRecebido, statusEntrega: "lido" },
  });

  if (!lead.iaAtiva) {
    // Handoff já ocorreu: a IA não responde mais, mensagem só fica registrada
    // para o vendedor visualizar na timeline.
    return { respondeuIa: false };
  }

  const delayMs = delayAleatorioRespostaIa();
  const agendadoPara = new Date(Date.now() + delayMs);
  await prisma.lead.update({
    where: { id: leadId },
    data: { respostaIaAgendadaPara: agendadoPara, respostaIaMensagemGatilhoId: mensagemRecebida.id },
  });

  return { respondeuIa: true, agendadoParaMs: Math.round(delayMs), agendadoPara };
}

/**
 * Varre leads com resposta de IA agendada cuja hora já chegou e dispara
 * cada uma. "Reivindica" o lead com um update atômico (compare-and-swap no
 * respostaIaMensagemGatilhoId) antes de processar — evita duplicar o envio
 * se o poller local e o heartbeat do worker rodarem quase ao mesmo tempo.
 */
export async function pollRespostasIaAgendadas() {
  const agora = new Date();
  const leadsProntos = await comRetryConexao(() =>
    prisma.lead.findMany({
      where: { respostaIaAgendadaPara: { lte: agora }, iaAtiva: true },
      select: { id: true, respostaIaMensagemGatilhoId: true },
    })
  );

  for (const lead of leadsProntos) {
    if (!lead.respostaIaMensagemGatilhoId) continue;
    const mensagemGatilhoId = lead.respostaIaMensagemGatilhoId;

    const { count } = await comRetryConexao(() =>
      prisma.lead.updateMany({
        where: { id: lead.id, respostaIaMensagemGatilhoId: mensagemGatilhoId },
        data: { respostaIaAgendadaPara: null, respostaIaMensagemGatilhoId: null },
      })
    );
    if (count === 0) continue; // outro poller já reivindicou esse lead

    try {
      await responderComIa(lead.id, mensagemGatilhoId);
    } catch (err) {
      console.error(`[conversationService] erro ao processar resposta agendada do lead ${lead.id}:`, err);
    }
  }
}

/**
 * Gera e envia a resposta da IA para a mensagem `mensagemGatilhoId`. Antes
 * de agir, reconfere se a IA ainda está ativa e se essa ainda é a mensagem
 * mais recente do lead (se chegou outra mensagem nova nesse meio tempo, o
 * agendamento dela é quem deve responder; se um vendedor já assumiu, não
 * faz nada — evita a IA duplicar ou atropelar um atendimento humano).
 */
export async function responderComIa(leadId: string, mensagemGatilhoId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { etapaAtual: true, empresa: true },
  });
  if (!lead.iaAtiva) return;

  const maisRecente = await prisma.mensagem.findFirst({
    where: { leadId },
    orderBy: { enviadoEm: "desc" },
  });
  if (!maisRecente || maisRecente.id !== mensagemGatilhoId) return;

  const agente = await prisma.agenteIa.findFirst({
    where: { etapaId: lead.etapaAtualId, ativo: true },
  });

  const historicoRows = await prisma.mensagem.findMany({
    where: { leadId: lead.id },
    orderBy: { enviadoEm: "asc" },
    take: 30,
  });
  const historico = historicoRows
    .slice(0, -1) // exclui a mensagem-gatilho, passada separadamente abaixo
    .map((m) => ({ remetente: m.remetente, conteudo: m.conteudo }));

  const decisao = await gerarResposta({
    leadNome: lead.nome,
    etapaNome: lead.etapaAtual.nome,
    etapaOrdem: lead.etapaAtual.ordem,
    persona: agente?.persona ?? `Você representa a ${lead.empresa.nome}.`,
    objetivo: agente?.objetivo ?? "Qualificar o lead e conduzi-lo até o agendamento de uma reunião.",
    historico,
    mensagemRecebida: maisRecente.conteudo,
  });

  // A chamada à IA acima pode levar alguns segundos — reconfere agora, bem
  // antes de enviar de fato, se ninguém pausou a IA ou assumiu a conversa
  // nesse meio-tempo. Checar só no início da função (como antes) deixava
  // uma janela onde um "Pausar IA" clicado durante a geração da resposta
  // era ignorado e a mensagem saía mesmo assim.
  const leadNoMomentoDoEnvio = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!leadNoMomentoDoEnvio?.iaAtiva) return;

  const iaMensagem = await prisma.mensagem.create({
    data: { leadId: lead.id, remetente: "ia", conteudo: decisao.resposta, statusEntrega: "enviado" },
  });

  await enviarEAtualizarStatus(iaMensagem.id, lead.empresaId, lead.telefone, decisao.resposta);

  let etapaFinal = lead.etapaAtual;
  let iaAtivaFinal: boolean = lead.iaAtiva;
  let statusFinal = lead.status;
  let vendedorIdFinal = lead.vendedorId;
  let reuniaoCriada = null as Awaited<ReturnType<typeof prisma.reuniao.create>> | null;

  if (decisao.marcarPerdido) {
    statusFinal = "perdido";
    iaAtivaFinal = false;
    void criarNotificacao(lead.empresaId, {
      tipo: "conversa_mudou_etapa",
      titulo: `${lead.nome} marcado como perdido`,
      corpo: decisao.motivoTransicao || "A IA encerrou o atendimento.",
      leadId: lead.id,
    });
  } else if (decisao.avancarEtapa || decisao.sugerirReuniao) {
    const proximaEtapa = decisao.sugerirReuniao
      ? await prisma.etapaFunil.findFirst({
          where: { empresaId: lead.empresaId, tipo: "funil" },
          orderBy: { ordem: "desc" },
        })
      : await prisma.etapaFunil.findFirst({
          where: { empresaId: lead.empresaId, tipo: "funil", ordem: { gt: lead.etapaAtual.ordem } },
          orderBy: { ordem: "asc" },
        });

    if (proximaEtapa && proximaEtapa.id !== lead.etapaAtualId) {
      await prisma.historicoEtapa.updateMany({
        where: { leadId: lead.id, saiuEm: null },
        data: { saiuEm: new Date() },
      });
      await prisma.historicoEtapa.create({
        data: { leadId: lead.id, etapaId: proximaEtapa.id, motivoTransicao: decisao.motivoTransicao },
      });
      etapaFinal = proximaEtapa;
      void criarNotificacao(lead.empresaId, {
        tipo: "conversa_mudou_etapa",
        titulo: `${lead.nome} avançou para ${proximaEtapa.nome}`,
        corpo: decisao.motivoTransicao || "A IA avançou o lead de etapa.",
        leadId: lead.id,
      });

      if (proximaEtapa.handoffHumano) {
        iaAtivaFinal = false;
        if (!vendedorIdFinal) {
          const vendedor = await escolherVendedor(lead.empresaId);
          vendedorIdFinal = vendedor?.id ?? null;
        }
        void criarNotificacao(lead.empresaId, {
          tipo: "conversa_mudou_etapa",
          titulo: `${lead.nome} precisa de atendimento humano`,
          corpo: `A IA pausou automaticamente na etapa "${proximaEtapa.nome}".`,
          leadId: lead.id,
        });
      }
    }

    if (decisao.sugerirReuniao) {
      let dataHora = dataFuturaValida(decisao.dataHoraSugerida);
      if (!dataHora) {
        // Lead não especificou dia/horário — usa o padrão de "daqui a alguns dias, de manhã".
        dataHora = new Date();
        dataHora.setDate(dataHora.getDate() + REUNIAO_DIAS_A_FRENTE);
        dataHora.setHours(10, 0, 0, 0);
      }

      if (vendedorIdFinal) {
        dataHora = await proximoHorarioLivre(vendedorIdFinal, dataHora);
      }

      // Se a empresa tem um link de Meet configurado (Configurações > Agenda),
      // a reunião marcada pela IA já sai como Google Meet em vez de ligação de
      // WhatsApp — sem isso, toda reunião da IA nascia "whatsapp" mesmo com o
      // Meet configurado, e o lead nunca recebia o link.
      const configMeet = await prisma.configuracao.findUnique({
        where: { empresaId_chave: { empresaId: lead.empresaId, chave: "google_meet_link" } },
      });
      const meetLink = configMeet?.valor?.trim() || null;
      const modalidade: "google_meet" | "whatsapp" = meetLink ? "google_meet" : "whatsapp";

      // Se esse lead já tem uma reunião em aberto (ex: outra mensagem da mesma
      // conversa também disparou sugerir_reuniao), reagenda em vez de duplicar.
      const reuniaoExistente = await prisma.reuniao.findFirst({
        where: { leadId: lead.id, status: { in: ["agendada", "confirmada"] } },
        orderBy: { criadoEm: "desc" },
      });

      reuniaoCriada = reuniaoExistente
        ? await prisma.reuniao.update({
            where: { id: reuniaoExistente.id },
            data: { dataHora, vendedorId: vendedorIdFinal, modalidade, linkCalendario: meetLink },
          })
        : await prisma.reuniao.create({
            data: {
              leadId: lead.id,
              vendedorId: vendedorIdFinal,
              dataHora,
              status: "agendada",
              resultado: "pendente",
              modalidade,
              linkCalendario: meetLink,
            },
          });

      void sincronizarReuniaoComGoogle(reuniaoCriada.id);
      void criarNotificacao(lead.empresaId, {
        tipo: "conversa_mudou_etapa",
        titulo: `Reunião agendada com ${lead.nome}`,
        corpo: `Marcada para ${dataHora.toLocaleString("pt-BR")}.`,
        leadId: lead.id,
        reuniaoId: reuniaoCriada.id,
      });

      if (meetLink) {
        const dataFormatada = dataHora.toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const mensagemLink = await prisma.mensagem.create({
          data: {
            leadId: lead.id,
            remetente: "ia",
            conteudo: `Nossa reunião fica marcada para ${dataFormatada}, pelo Google Meet. Segue o link: ${meetLink}`,
            statusEntrega: "enviado",
          },
        });
        await enviarEAtualizarStatus(mensagemLink.id, lead.empresaId, lead.telefone, mensagemLink.conteudo);
      }
    }
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      etapaAtualId: etapaFinal.id,
      iaAtiva: iaAtivaFinal,
      status: statusFinal,
      vendedorId: vendedorIdFinal,
    },
    include: { etapaAtual: true },
  });

  return { respondeuIa: true, mensagem: iaMensagem, lead: leadAtualizado, reuniao: reuniaoCriada };
}

/**
 * Dispara a primeira mensagem automática assim que um lead é criado
 * (seção 2, passo 2 do descritivo técnico).
 */
export async function dispararPrimeiraMensagem(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { etapaAtual: true, empresa: true },
  });

  // A primeira mensagem é configurável (Configurar IA → Primeira mensagem)
  // e sai exatamente como definida — não é a IA improvisando texto genérico.
  // Só cai pra geração livre se a empresa nunca configurou um texto.
  const configTemplate = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: lead.empresaId, chave: "primeira_mensagem_template" } },
  });

  let texto: string;
  if (configTemplate?.valor) {
    texto = configTemplate.valor
      .replaceAll("{nome}", lead.nome.split(" ")[0])
      .replaceAll("{empresa}", lead.empresa.nome);
  } else {
    const agente = await prisma.agenteIa.findFirst({
      where: { etapaId: lead.etapaAtualId, ativo: true },
    });
    const decisao = await gerarResposta({
      leadNome: lead.nome,
      etapaNome: lead.etapaAtual.nome,
      etapaOrdem: lead.etapaAtual.ordem,
      persona: agente?.persona ?? `Você representa a ${lead.empresa.nome}.`,
      objetivo: agente?.objetivo ?? "Dar boas-vindas ao lead e entender o que ele precisa.",
      historico: [],
      mensagemRecebida: "(novo lead — envie a primeira mensagem de boas-vindas)",
    });
    texto = decisao.resposta;
  }

  const mensagem = await prisma.mensagem.create({
    data: { leadId: lead.id, remetente: "ia", conteudo: texto, statusEntrega: "enviado" },
  });

  await enviarEAtualizarStatus(mensagem.id, lead.empresaId, lead.telefone, texto);

  return mensagem;
}
