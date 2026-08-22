import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { buildGoogleAuthUrl, googleConfigurado, GOOGLE_STATE_COOKIE } from "@/lib/googleAuth";

/**
 * Conecta o Google Calendar a uma sessão CALINDA já existente — para quem
 * fez login com e-mail/senha (login com Google já pede o calendário junto,
 * ver /api/auth/google/route.ts). Mesmo escopo, callback diferente: aqui só
 * grava os tokens no usuário logado, não cria sessão nova.
 */
export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  if (!googleConfigurado()) {
    return NextResponse.json({ erro: "Integração com Google não configurada" }, { status: 501 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/google-calendar/callback`;
  const state = randomBytes(16).toString("hex");

  const res = NextResponse.redirect(buildGoogleAuthUrl(state, redirectUri, { prompt: "consent" }));
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
