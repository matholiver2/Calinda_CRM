import { prisma } from "@/lib/db";
import { sincronizarReuniaoComGoogle } from "@/lib/googleCalendarSync";
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
];

type ContextoFerramenta = { empresaId: string; usuarioId: string };

export async function executarFerramentaAssistente(
  nome: string,
  argumentos: Record<string, unknown>,
  ctx: ContextoFerramenta
): Promise<string> {
  if (nome === "agendar_reuniao") return executarAgendarReuniao(argumentos, ctx);
  return `Ferramenta desconhecida: ${nome}.`;
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

  const configMeet = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "google_meet_link" } },
  });
  const meetLink = configMeet?.valor?.trim() || null;
  const modalidade: "google_meet" | "whatsapp" = meetLink ? "google_meet" : "whatsapp";

  const reuniao = await prisma.reuniao.create({
    data: {
      leadId: lead.id,
      vendedorId: ctx.usuarioId,
      dataHora,
      status: "agendada",
      resultado: "pendente",
      modalidade,
      linkCalendario: meetLink,
    },
  });

  void sincronizarReuniaoComGoogle(reuniao.id);
  void enviarConviteReuniaoPorEmail(reuniao.id, emails);
  void criarNotificacao(ctx.empresaId, {
    tipo: "conversa_mudou_etapa",
    titulo: `Reunião agendada com ${lead.nome}`,
    corpo: `Marcada pelo Assistente para ${dataHora.toLocaleString("pt-BR")}.`,
    leadId: lead.id,
    reuniaoId: reuniao.id,
  });

  const dataFormatada = dataHora.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const destinosEmail = [lead.email, ...emails].filter((e): e is string => !!e);

  let resultado = `Reunião marcada com ${lead.nome} para ${dataFormatada}, modalidade ${
    modalidade === "google_meet" ? "Google Meet" : "ligação por WhatsApp"
  }.`;
  if (modalidade === "google_meet" && destinosEmail.length > 0) {
    resultado += ` Convite por e-mail enviado pra: ${destinosEmail.join(", ")}.`;
  } else if (modalidade === "whatsapp" && emails.length > 0) {
    resultado += ` Não foi possível enviar convite por e-mail com link porque não há um Google Meet configurado (Configurações → Agenda) — a reunião ficou marcada como ligação por WhatsApp.`;
  }
  return resultado;
}
