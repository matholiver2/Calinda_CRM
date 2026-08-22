// Login com Google (OAuth 2.0 "Authorization Code" flow), implementado sem
// SDK — apenas chamadas REST diretas ao Google, para manter o mesmo sistema
// de sessão (JWT em cookie httpOnly) já usado pelo login por senha.
//
// Requer GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (Google Cloud Console >
// APIs & Services > Credentials > OAuth Client ID, tipo "Web application",
// com redirect URIs "<APP_URL>/api/auth/google/callback" e
// "<APP_URL>/api/auth/google-calendar/callback"). Sem essas variáveis, o
// botão "Entrar com Google" fica desabilitado na tela de login.
//
// O login com Google já pede os escopos do Calendar e de envio de e-mail
// junto (ver GOOGLE_CALENDAR_SCOPE / GOOGLE_GMAIL_SEND_SCOPE) — um único
// consentimento cobre identidade, calendário e envio de orçamento por
// e-mail. Quem loga com senha conecta depois via /api/auth/google-calendar
// (mesmo helper, mesmos escopos). Quem já tinha conectado antes de o escopo
// do Gmail existir precisa reconectar pra ganhar a permissão nova.

export const GOOGLE_STATE_COOKIE = "assiz_google_state";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GOOGLE_LOGIN_SCOPE = `openid email profile ${GOOGLE_CALENDAR_SCOPE} ${GOOGLE_GMAIL_SEND_SCOPE}`;

export function googleConfigurado(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function buildGoogleAuthUrl(
  state: string,
  redirectUri: string,
  opts?: { scope?: string; accessType?: "online" | "offline"; prompt?: string }
): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: opts?.scope ?? GOOGLE_LOGIN_SCOPE,
    state,
    access_type: opts?.accessType ?? "offline",
    prompt: opts?.prompt ?? "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Falha ao trocar código Google: ${res.status}`);
  return (await res.json()) as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Falha ao renovar token Google: ${res.status}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar perfil Google: ${res.status}`);
  return res.json();
}
