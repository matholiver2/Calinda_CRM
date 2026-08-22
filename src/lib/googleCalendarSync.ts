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
 */
export async function sincronizarReuniaoComGoogle(reuniaoId: string): Promise<void> {
  const reuniao = await prisma.reuniao.findUnique({
    where: { id: reuniaoId },
    include: { lead: true, vendedor: true },
  });
  if (!reuniao || !reuniao.vendedor?.googleCalendarRefreshToken) return;

  try {
    if (reuniao.status === "cancelada") {
      if (reuniao.googleEventId) {
        await excluirEventoGoogle(reuniao.vendedor, reuniao.googleEventId);
      }
      return;
    }

    if (reuniao.googleEventId) {
      const ok = await atualizarEventoGoogle(reuniao.vendedor, reuniao.googleEventId, reuniao, reuniao.lead);
      if (ok) return;
      // Evento não existe mais no Google (ex: apagado por lá) — recria abaixo.
    }

    const novoId = await criarEventoGoogle(reuniao.vendedor, reuniao, reuniao.lead);
    if (novoId) {
      await prisma.reuniao.update({ where: { id: reuniao.id }, data: { googleEventId: novoId } });
    }
  } catch (err) {
    console.error("[googleCalendarSync] falha ao sincronizar reunião", reuniaoId, err);
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
