import { prisma } from "@/lib/db";
import { enviarEmailSimples } from "@/lib/gmail";

/**
 * Convite por e-mail pro cliente quando a reunião é Google Meet — mesma
 * ideia do Google Calendar mandando o link automaticamente. Silencioso se
 * faltar qualquer pré-requisito (lead sem e-mail, sem vendedor atribuído,
 * vendedor sem Google conectado) — a reunião continua válida mesmo sem
 * esse e-mail sair, é só um "a mais".
 */
export async function enviarConviteReuniaoPorEmail(reuniaoId: string): Promise<void> {
  try {
    const reuniao = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: { lead: { include: { empresa: true } }, vendedor: true },
    });
    if (!reuniao || reuniao.modalidade !== "google_meet" || !reuniao.linkCalendario) return;
    if (!reuniao.lead.email || !reuniao.vendedor) return;

    const dataFormatada = reuniao.dataHora.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const resultado = await enviarEmailSimples(reuniao.vendedor, {
      para: reuniao.lead.email,
      assunto: `Reunião com ${reuniao.lead.empresa.nome} — ${dataFormatada}`,
      corpo: `Olá, ${reuniao.lead.nome.split(" ")[0]}!\n\nSua reunião com a ${reuniao.lead.empresa.nome} está confirmada para ${dataFormatada}.\n\nLink do Google Meet: ${reuniao.linkCalendario}\n\nAté lá!`,
    });

    if (!resultado.ok) {
      console.error(`[reuniaoEmail] falha ao enviar convite pro lead ${reuniao.leadId}:`, resultado.erro);
    }
  } catch (err) {
    console.error(`[reuniaoEmail] erro ao processar convite da reunião ${reuniaoId}:`, err);
  }
}
