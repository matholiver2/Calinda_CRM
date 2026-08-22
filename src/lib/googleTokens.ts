// Garante um access_token do Google válido para um Usuario, renovando via
// refresh_token quando expirado. Compartilhado por googleCalendar.ts e
// gmail.ts — os dois usam os mesmos tokens (mesma conexão Google por
// usuário), só pedem escopos diferentes no consentimento.

import { prisma } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/googleAuth";
import type { Usuario } from "@prisma/client";

export async function accessTokenValido(usuario: Usuario): Promise<string | null> {
  if (!usuario.googleCalendarRefreshToken) return null;

  const expiraEm = usuario.googleCalendarTokenExpiry?.getTime() ?? 0;
  const aindaValido = expiraEm > Date.now() + 60_000; // margem de 1 min
  if (aindaValido && usuario.googleCalendarAccessToken) {
    return usuario.googleCalendarAccessToken;
  }

  const renovado = await refreshGoogleAccessToken(usuario.googleCalendarRefreshToken);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      googleCalendarAccessToken: renovado.access_token,
      googleCalendarTokenExpiry: new Date(Date.now() + renovado.expires_in * 1000),
    },
  });
  return renovado.access_token;
}
