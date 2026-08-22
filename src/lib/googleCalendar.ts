// Cliente REST da Google Calendar API — sem SDK, mesmo estilo de
// googleAuth.ts. Todas as funções recebem o Usuario (precisa ter
// googleCalendarRefreshToken) e cuidam de renovar o access_token quando
// expirado antes de chamar a API.

import { prisma, comRetryConexao } from "@/lib/db";
import { accessTokenValido } from "@/lib/googleTokens";
import type { Usuario, Lead } from "@prisma/client";

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DURACAO_PADRAO_MIN = 60;

function eventoBody(reuniao: { dataHora: Date; status: string }, lead: Lead) {
  const inicio = reuniao.dataHora;
  const fim = new Date(inicio.getTime() + DURACAO_PADRAO_MIN * 60_000);
  return {
    summary: `CALINDA — ${lead.nome}`,
    description: `Reunião com ${lead.nome} (${lead.telefone})${lead.email ? ` · ${lead.email}` : ""}\nAgendada via CALINDA.`,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
  };
}

export async function criarEventoGoogle(
  usuario: Usuario,
  reuniao: { dataHora: Date; status: string },
  lead: Lead
): Promise<string | null> {
  const token = await accessTokenValido(usuario);
  if (!token) return null;

  const res = await fetch(CALENDAR_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(eventoBody(reuniao, lead)),
  });
  if (!res.ok) {
    console.error("[googleCalendar] falha ao criar evento:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function atualizarEventoGoogle(
  usuario: Usuario,
  googleEventId: string,
  reuniao: { dataHora: Date; status: string },
  lead: Lead
): Promise<boolean> {
  const token = await accessTokenValido(usuario);
  if (!token) return false;

  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(eventoBody(reuniao, lead)),
  });
  if (!res.ok && res.status !== 404) {
    console.error("[googleCalendar] falha ao atualizar evento:", res.status, await res.text().catch(() => ""));
  }
  return res.ok;
}

export async function excluirEventoGoogle(usuario: Usuario, googleEventId: string): Promise<boolean> {
  const token = await accessTokenValido(usuario);
  if (!token) return false;

  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 410 Gone = já tinha sido apagado no Google, tudo bem
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error("[googleCalendar] falha ao excluir evento:", res.status, await res.text().catch(() => ""));
  }
  return res.ok || res.status === 404 || res.status === 410;
}

export type EventoAlterado = {
  id: string;
  status: string; // "confirmed" | "cancelled"
  start?: { dateTime?: string; date?: string };
};

export async function listarEventosAlterados(
  usuario: Usuario
): Promise<{ eventos: EventoAlterado[]; syncTokenNovo: string | null }> {
  const token = await accessTokenValido(usuario);
  if (!token) return { eventos: [], syncTokenNovo: null };

  const params = new URLSearchParams();
  if (usuario.googleCalendarSyncToken) {
    params.set("syncToken", usuario.googleCalendarSyncToken);
  } else {
    // Primeira sincronização: sem syncToken, limita aos últimos 30 dias pra
    // não trazer o histórico inteiro do calendário da pessoa.
    params.set("updatedMin", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  }

  const res = await fetch(`${CALENDAR_BASE}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 410) {
    // syncToken expirado/inválido — limpa e tenta de novo na próxima rodada
    await comRetryConexao(() =>
      prisma.usuario.update({ where: { id: usuario.id }, data: { googleCalendarSyncToken: null } })
    );
    return { eventos: [], syncTokenNovo: null };
  }
  if (!res.ok) {
    console.error("[googleCalendar] falha ao listar eventos:", res.status, await res.text().catch(() => ""));
    return { eventos: [], syncTokenNovo: null };
  }

  const data = (await res.json()) as { items: EventoAlterado[]; nextSyncToken?: string };
  return { eventos: data.items ?? [], syncTokenNovo: data.nextSyncToken ?? null };
}
