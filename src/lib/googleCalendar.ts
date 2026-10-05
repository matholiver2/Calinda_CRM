// Cliente REST da Google Calendar API — sem SDK, mesmo estilo de
// googleAuth.ts. Todas as funções recebem o Usuario (precisa ter
// googleCalendarRefreshToken) e cuidam de renovar o access_token quando
// expirado antes de chamar a API.

import { prisma, comRetryConexao } from "@/lib/db";
import { accessTokenValido } from "@/lib/googleTokens";
import type { Usuario, Lead } from "@prisma/client";

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DURACAO_PADRAO_MIN = 60;

type ReuniaoParaEvento = {
  dataHora: Date;
  status: string;
  titulo?: string | null;
  descricao?: string | null;
};

type OpcoesEvento = {
  /** Pede pro Google gerar um link de Google Meet de verdade pra esse evento (conferenceData). */
  comGoogleMeet?: boolean;
  /** E-mails convidados como "attendees" nativos — recebem convite do próprio Google Calendar, com RSVP e botão de entrar no Meet. */
  attendees?: string[];
  /** Endereço do encontro presencial — vira o campo "location" nativo do Google Calendar. */
  endereco?: string | null;
};

function eventoBody(reuniao: ReuniaoParaEvento, lead: Lead, opcoes: OpcoesEvento) {
  const inicio = reuniao.dataHora;
  const fim = new Date(inicio.getTime() + DURACAO_PADRAO_MIN * 60_000);
  const attendees = [...new Set(opcoes.attendees ?? [])].filter(Boolean);

  return {
    summary: reuniao.titulo?.trim() || `CALINDA — ${lead.nome}`,
    description:
      reuniao.descricao?.trim() ||
      `Reunião com ${lead.nome} (${lead.telefone})${lead.email ? ` · ${lead.email}` : ""}\nAgendada via CALINDA.`,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
    ...(opcoes.endereco?.trim() ? { location: opcoes.endereco.trim() } : {}),
    ...(attendees.length > 0 ? { attendees: attendees.map((email) => ({ email })) } : {}),
    ...(opcoes.comGoogleMeet
      ? {
          conferenceData: {
            createRequest: {
              // Precisa ser único por requisição — reaproveitar o mesmo id
              // numa segunda chamada faria o Google devolver o mesmo pedido
              // de criação (idempotência), então geramos um novo a cada vez.
              requestId: `calinda-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

/** Monta a query string com os parâmetros que a API exige pra de fato processar conferência/convites. */
function queryParams(opcoes: OpcoesEvento): string {
  const params = new URLSearchParams();
  if (opcoes.comGoogleMeet) params.set("conferenceDataVersion", "1");
  if ((opcoes.attendees?.length ?? 0) > 0) params.set("sendUpdates", "all");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

type RespostaEventoGoogle = {
  id: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

function extrairMeetLink(data: RespostaEventoGoogle): string | null {
  if (data.hangoutLink) return data.hangoutLink;
  const video = data.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video");
  return video?.uri ?? null;
}

export type ResultadoCriarEvento = { eventId: string; meetLink: string | null } | null;

export async function criarEventoGoogle(
  usuario: Usuario,
  reuniao: ReuniaoParaEvento,
  lead: Lead,
  opcoes: OpcoesEvento = {}
): Promise<ResultadoCriarEvento> {
  const token = await accessTokenValido(usuario);
  if (!token) return null;

  const res = await fetch(`${CALENDAR_BASE}${queryParams(opcoes)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(eventoBody(reuniao, lead, opcoes)),
  });
  if (!res.ok) {
    console.error("[googleCalendar] falha ao criar evento:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as RespostaEventoGoogle;
  return { eventId: data.id, meetLink: extrairMeetLink(data) };
}

export type ResultadoAtualizarEvento = { ok: boolean; meetLink: string | null };

export async function atualizarEventoGoogle(
  usuario: Usuario,
  googleEventId: string,
  reuniao: ReuniaoParaEvento,
  lead: Lead,
  opcoes: OpcoesEvento = {}
): Promise<ResultadoAtualizarEvento> {
  const token = await accessTokenValido(usuario);
  if (!token) return { ok: false, meetLink: null };

  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}${queryParams(opcoes)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(eventoBody(reuniao, lead, opcoes)),
  });
  if (!res.ok) {
    if (res.status !== 404) {
      console.error("[googleCalendar] falha ao atualizar evento:", res.status, await res.text().catch(() => ""));
    }
    return { ok: false, meetLink: null };
  }
  const data = (await res.json()) as RespostaEventoGoogle;
  return { ok: true, meetLink: extrairMeetLink(data) };
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
