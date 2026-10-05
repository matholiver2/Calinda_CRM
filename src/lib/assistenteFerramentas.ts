import { prisma } from "@/lib/db";
import { sincronizarReuniaoComGoogle } from "@/lib/googleCalendarSync";
import { proximoHorarioLivre } from "@/lib/conversationService";
import { enviarConviteReuniaoPorEmail } from "@/lib/reuniaoEmail";
import { criarNotificacao } from "@/lib/notificacoes";
import type { FerramentaDeclaracao } from "@/lib/ai/engine";

/**
 * Ferramentas que o chat Assistente pode chamar de verdade no sistema —
 * function calling do Gemini (ver chamarGeminiComFerramentas). Cada uma
 * daqui é uma ação real (grava no banco, sincroniza calendário, manda
 * e-mail), não só texto.
 */
export const FERRAMENTAS_ASSISTENTE: FerramentaDeclaracao[] = [
  {
    name: "agendar_reuniao",
    description:
      "Agenda de verdade uma reunião com um lead/cliente já cadastrado no CRM, sincroniza com o Google Calendar do vendedor e manda convite por e-mail. Use sempre que a pessoa pedir explicitamente pra marcar/agendar uma reunião com alguém.",
    // A API do Gemini usa o enum Type do proto Schema pra "type" — precisa
    // ser MAIÚSCULO ("OBJECT"/"STRING"/"ARRAY"), diferente do JSON Schema
    // padrão (minúsculo) — usar minúsculo aqui faz a chamada falhar com 400.
    parameters: {
      type: "OBJECT",
      properties: {
        nome_lead: {
          type: "STRING",
          description: "Nome (ou parte do nome) do lead/cliente cadastrado no CRM com quem marcar a reunião.",
        },
        data_hora_iso: {
          type: "STRING",
          description:
            "Data e hora da reunião em ISO 8601 com timezone, ex: 2026-06-20T15:00:00-03:00. Resolva datas relativas (amanhã, sexta-feira) usando a data/hora atual informada no contexto da conversa.",
        },
        emails_convite: {
          type: "ARRAY",
          items: { type: "STRING" },
          description:
            "E-mails adicionais (além do e-mail do lead, se ele já tiver um cadastrado) que devem receber o convite da reunião. Deixe vazio se a pessoa não pedir isso.",
        },
      },
      required: ["nome_lead", "data_hora_iso"],
    },
  },
  {
    name: "consultar_regua_followup",
    description:
      "Consulta o perfil de follow-up (A/B/C), o contrato e qual o próximo marco da régua de relacionamento devido ou pendente pra um cliente específico. Use quando a pessoa perguntar algo como 'qual o próximo follow-up do cliente X' ou 'o que eu devo fazer com o cliente Y agora'.",
    parameters: {
      type: "OBJECT",
      properties: {
        nome_lead: {
          type: "STRING",
          description: "Nome (ou parte do nome) do lead/cliente cadastrado no CRM.",
        },
      },
      required: ["nome_lead"],
    },
  },
];

type ContextoFerramenta = { empresaId: string; usuarioId: string };

export async function executarFerramentaAssistente(
  nome: string,
  argumentos: Record<string, unknown>,
  ctx: ContextoFerramenta
): Promise<string> {
  if (nome === "agendar_reuniao") return executarAgendarReuniao(argumentos, ctx);
  if (nome === "consultar_regua_followup") return executarConsultarReguaFollowup(argumentos, ctx);
  return `Ferramenta desconhecida: ${nome}.`;
}

const PERFIL_LABEL: Record<string, string> = { a: "A (estratégico)", b: "B (intermediário)", c: "C (operacional)" };

async function executarConsultarReguaFollowup(argumentos: Record<string, unknown>, ctx: ContextoFerramenta): Promise<string> {
  const nomeLead = typeof argumentos.nome_lead === "string" ? argumentos.nome_lead.trim() : "";
  if (!nomeLead) return "Faltou o nome do lead/cliente.";

  const candidatos = await prisma.lead.findMany({
    where: { empresaId: ctx.empresaId, nome: { contains: nomeLead, mode: "insensitive" } },
    select: { id: true, nome: true, perfilFollowUp: true },
    take: 5,
  });
  if (candidatos.length === 0) return `Não encontrei nenhum lead/cliente com o nome "${nomeLead}".`;
  if (candidatos.length > 1) {
    return `Encontrei mais de um parecido com "${nomeLead}": ${candidatos.map((c) => c.nome).join(", ")}. Pergunte qual deles é.`;
  }

  const lead = candidatos[0];
  if (!lead.perfilFollowUp) {
    return `${lead.nome} ainda não tem um perfil de follow-up classificado (A/B/C) — defina na tela do cliente antes de entrar na régua automática.`;
  }

  const venda = await prisma.venda.findFirst({
    where: { leadId: lead.id, status: "confirmada", contratoInicioEm: { not: null }, periodicidadeContrato: { not: null } },
    orderBy: { contratoInicioEm: "desc" },
  });
  if (!venda?.contratoInicioEm || !venda.periodicidadeContrato) {
    return `${lead.nome} tem perfil ${PERFIL_LABEL[lead.perfilFollowUp]}, mas nenhuma venda com data de início e periodicidade de contrato cadastradas — sem isso não dá pra calcular a régua.`;
  }

  const diasDesdeInicio = Math.floor((Date.now() - venda.contratoInicioEm.getTime()) / 86_400_000);
  const reguas = await prisma.reguaFollowUp.findMany({
    where: { empresaId: ctx.empresaId, perfil: lead.perfilFollowUp, periodicidade: venda.periodicidadeContrato },
    orderBy: { diaOffset: "asc" },
    include: { tipoFollowUp: { select: { nome: true, canal: true } } },
  });
  if (reguas.length === 0) {
    return `${lead.nome} tem perfil ${PERFIL_LABEL[lead.perfilFollowUp]} e contrato ${venda.periodicidadeContrato}, mas essa combinação não tem marcos configurados na régua ainda.`;
  }

  const envios = await prisma.followUpReguaEnvio.findMany({ where: { leadId: lead.id, reguaId: { in: reguas.map((r) => r.id) } } });
  const executadosIds = new Set(envios.map((e) => e.reguaId));

  const proximoPendente = reguas.find((r) => !executadosIds.has(r.id) && r.diaOffset <= diasDesdeInicio);
  const proximoFuturo = reguas.find((r) => !executadosIds.has(r.id) && r.diaOffset > diasDesdeInicio);

  let resultado = `${lead.nome} — perfil ${PERFIL_LABEL[lead.perfilFollowUp]}, contrato ${venda.periodicidadeContrato}, dia ${diasDesdeInicio} desde o início.`;
  if (proximoPendente) {
    resultado += ` Follow-up pendente (devido no dia ${proximoPendente.diaOffset}, ainda não executado): "${proximoPendente.tipoFollowUp.nome}" (${proximoPendente.tipoFollowUp.canal === "automatico" ? "automático" : "manual"}).`;
  } else if (proximoFuturo) {
    resultado += ` Nenhum pendente agora — próximo marco é "${proximoFuturo.tipoFollowUp.nome}" no dia ${proximoFuturo.diaOffset} (faltam ${proximoFuturo.diaOffset - diasDesdeInicio} dias).`;
  } else {
    resultado += ` Todos os marcos da régua pra esse ciclo já foram executados.`;
  }
  return resultado;
}

async function executarAgendarReuniao(
  argumentos: Record<string, unknown>,
  ctx: ContextoFerramenta
): Promise<string> {
  const nomeLead = typeof argumentos.nome_lead === "string" ? argumentos.nome_lead.trim() : "";
  const dataHoraIso = typeof argumentos.data_hora_iso === "string" ? argumentos.data_hora_iso : "";
  const emails = Array.isArray(argumentos.emails_convite)
    ? argumentos.emails_convite.filter((e): e is string => typeof e === "string" && e.includes("@"))
    : [];

  if (!nomeLead || !dataHoraIso) {
    return "Faltou o nome do lead ou a data/hora da reunião — pergunte isso pra pessoa antes de tentar de novo.";
  }

  const dataHora = new Date(dataHoraIso);
  if (Number.isNaN(dataHora.getTime()) || dataHora.getTime() <= Date.now()) {
    return "A data/hora informada não é válida ou já é no passado — peça pra pessoa confirmar de novo.";
  }

  const candidatos = await prisma.lead.findMany({
    where: { empresaId: ctx.empresaId, nome: { contains: nomeLead, mode: "insensitive" } },
    select: { id: true, nome: true, email: true },
    take: 5,
  });

  if (candidatos.length === 0) {
    return `Não encontrei nenhum lead/cliente com o nome "${nomeLead}" cadastrado no sistema — confirme o nome certo com a pessoa.`;
  }
  if (candidatos.length > 1) {
    return `Encontrei mais de um lead parecido com "${nomeLead}": ${candidatos
      .map((c) => c.nome)
      .join(", ")}. Pergunte pra pessoa qual deles é.`;
  }

  const lead = candidatos[0];

  // Checa se o vendedor (a própria pessoa usando o Assistente) já tem outra
  // reunião nesse horário e empurra pro próximo horário livre em vez de
  // marcar em cima — mesma lógica usada quando é a IA do funil que agenda.
  const dataHoraFinal = await proximoHorarioLivre(ctx.usuarioId, dataHora);
  const horarioAjustado = dataHoraFinal.getTime() !== dataHora.getTime();

  const configMeet = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "google_meet_link" } },
  });
  const linkFallback = configMeet?.valor?.trim() || null;

  const reuniao = await prisma.reuniao.create({
    data: {
      leadId: lead.id,
      vendedorId: ctx.usuarioId,
      dataHora: dataHoraFinal,
      status: "agendada",
      resultado: "pendente",
      modalidade: "google_meet",
      linkCalendario: linkFallback,
      emailsConvidados: emails,
    },
  });

  // Awaited: a resposta pro usuário do Assistente precisa dizer se saiu um
  // Google Meet de verdade ou se caiu pra WhatsApp, não dá pra responder
  // isso sem esperar a sincronização terminar.
  const linkFinal = await sincronizarReuniaoComGoogle(reuniao.id);
  if (!linkFinal) {
    await prisma.reuniao.update({ where: { id: reuniao.id }, data: { modalidade: "whatsapp" } });
  }
  void enviarConviteReuniaoPorEmail(reuniao.id, emails);
  void criarNotificacao(ctx.empresaId, {
    tipo: "conversa_mudou_etapa",
    titulo: `Reunião agendada com ${lead.nome}`,
    corpo: `Marcada pelo Assistente para ${dataHoraFinal.toLocaleString("pt-BR")}.`,
    leadId: lead.id,
    reuniaoId: reuniao.id,
  });

  const dataFormatada = dataHoraFinal.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const destinosEmail = [lead.email, ...emails].filter((e): e is string => !!e);

  let resultado = `Reunião marcada com ${lead.nome} para ${dataFormatada}`;
  if (horarioAjustado) resultado += ` (ajustei o horário porque você já tinha outra reunião marcada nesse horário)`;
  resultado += `, modalidade ${linkFinal ? "Google Meet" : "ligação por WhatsApp"}.`;
  if (linkFinal) {
    resultado += ` Link: ${linkFinal}.`;
    if (destinosEmail.length > 0) resultado += ` Convite por e-mail enviado pra: ${destinosEmail.join(", ")}.`;
  } else if (emails.length > 0) {
    resultado += ` Não foi possível gerar um Google Meet (conecte seu Google Calendar em Configurações, ou configure um link fixo em Configurações → Agenda) — a reunião ficou marcada como ligação por WhatsApp.`;
  }
  return resultado;
}
