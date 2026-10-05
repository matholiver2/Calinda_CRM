import { prisma } from "@/lib/db";
import {
  criarEventoGoogle,
  atualizarEventoGoogle,
  excluirEventoGoogle,
  listarEventosAlterados,
} from "@/lib/googleCalendar";
import { comRetryConexao } from "@/lib/db";

/**
 * Empurra o estado atual de uma Reuniao pro Google Calendar do vendedor
 * responsável. Chamado depois de criar/editar/cancelar uma reunião (manual
 * ou pela IA). Não faz nada se o vendedor não tiver calendário conectado —
 * a reunião continua funcionando normalmente dentro do CALINDA.
 *
 * Quando a modalidade é "google_meet", pede pro Google gerar o link de
 * verdade (conferenceData) em vez de reutilizar um link fixo configurado —
 * e convida nativamente o e-mail do lead + emailsConvidados como attendees,
 * o que já dispara o convite por e-mail/Gmail com RSVP e botão de entrar
 * direto do próprio Google (sendUpdates=all). Devolve o linkCalendario final
 * (ou null se não deu pra gerar/sincronizar — ex: vendedor sem Google
 * conectado) pra quem chamou poder decidir um fallback.
 */
export async function sincronizarReuniaoComGoogle(reuniaoId: string): Promise<string | null> {
  const reuniao = await prisma.reuniao.findUnique({
    where: { id: reuniaoId },
    include: { lead: true, vendedor: true },
  });
  if (!reuniao) return null;
  // Sem vendedor com Google Calendar conectado não dá pra gerar o Meet de
  // verdade — devolve o que já estava salvo (ex: link fixo configurado como
  // fallback em Configurações > Agenda) em vez de null, pra não apagar um
  // fallback que quem chamou já tinha preenchido na criação.
  if (!reuniao.vendedor?.googleCalendarRefreshToken) return reuniao.linkCalendario;

  const comGoogleMeet = reuniao.modalidade === "google_meet";
  const attendees = [reuniao.lead.email, ...reuniao.emailsConvidados].filter((e): e is string => !!e);
  const opcoes = { comGoogleMeet, attendees, endereco: reuniao.modalidade === "presencial" ? reuniao.endereco : null };

  try {
    if (reuniao.status === "cancelada") {
      if (reuniao.googleEventId) {
        await excluirEventoGoogle(reuniao.vendedor, reuniao.googleEventId);
      }
      return reuniao.linkCalendario;
    }

    if (reuniao.googleEventId) {
      const resultado = await atualizarEventoGoogle(reuniao.vendedor, reuniao.googleEventId, reuniao, reuniao.lead, opcoes);
      if (resultado.ok) {
        const linkFinal = resultado.meetLink ?? reuniao.linkCalendario;
        if (linkFinal !== reuniao.linkCalendario) {
          await prisma.reuniao.update({ where: { id: reuniao.id }, data: { linkCalendario: linkFinal } });
        }
        return linkFinal;
      }
      // Evento não existe mais no Google (ex: apagado por lá) — recria abaixo.
    }

    const criado = await criarEventoGoogle(reuniao.vendedor, reuniao, reuniao.lead, opcoes);
    if (!criado) return reuniao.linkCalendario;

    const linkFinal = criado.meetLink ?? reuniao.linkCalendario;
    await prisma.reuniao.update({
      where: { id: reuniao.id },
      data: { googleEventId: criado.eventId, linkCalendario: linkFinal },
    });
    return linkFinal;
  } catch (err) {
    console.error("[googleCalendarSync] falha ao sincronizar reunião", reuniaoId, err);
    return reuniao.linkCalendario;
  }
}

/**
 * Puxa mudanças feitas direto no Google Calendar de volta pro CALINDA
 * (cancelamento ou reagendamento). Só reconcilia eventos que o CALINDA
 * criou (têm um googleEventId correspondente numa Reuniao) — eventos soltos
 * criados direto no Google são ignorados. Rodado em intervalo por
 * src/instrumentation.ts.
 */
export async function pollGoogleCalendars(): Promise<void> {
  const usuarios = await comRetryConexao(() =>
    prisma.usuario.findMany({
      where: { googleCalendarRefreshToken: { not: null } },
    })
  );

  for (const usuario of usuarios) {
    try {
      const { eventos, syncTokenNovo } = await listarEventosAlterados(usuario);

      for (const evento of eventos) {
        const reuniao = await comRetryConexao(() =>
          prisma.reuniao.findFirst({ where: { googleEventId: evento.id } })
        );
        if (!reuniao) continue;

        if (evento.status === "cancelled") {
          if (reuniao.status !== "cancelada") {
            await comRetryConexao(() =>
              prisma.reuniao.update({ where: { id: reuniao.id }, data: { status: "cancelada" } })
            );
          }
          continue;
        }

        const novaDataHora = evento.start?.dateTime ? new Date(evento.start.dateTime) : null;
        if (novaDataHora && novaDataHora.getTime() !== reuniao.dataHora.getTime()) {
          await comRetryConexao(() =>
            prisma.reuniao.update({ where: { id: reuniao.id }, data: { dataHora: novaDataHora } })
          );
        }
      }

      if (syncTokenNovo) {
        await comRetryConexao(() =>
          prisma.usuario.update({
            where: { id: usuario.id },
            data: { googleCalendarSyncToken: syncTokenNovo },
          })
        );
      }
    } catch (err) {
      console.error("[googleCalendarSync] falha no polling do usuário", usuario.id, err);
    }
  }
}
