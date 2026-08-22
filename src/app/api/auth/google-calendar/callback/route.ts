import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { exchangeGoogleCode, fetchGoogleUserInfo, GOOGLE_STATE_COOKIE } from "@/lib/googleAuth";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GOOGLE_STATE_COOKIE}=`))
    ?.split("=")[1];

  const falhar = (motivo: string) =>
    NextResponse.redirect(`${url.origin}/configuracoes?tab=integracoes&erro=${motivo}`);

  if (!code || !state || !cookieState || state !== cookieState) {
    return falhar("google_estado_invalido");
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google-calendar/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    if (!tokens.refresh_token) {
      // Acontece se o usuário já tinha consentido antes sem "prompt=consent"
      // pegar de novo — pedimos consent sempre então isso não deveria ocorrer,
      // mas sem refresh_token não dá pra manter a conexão funcionando.
      return falhar("google_sem_refresh_token");
    }

    const perfil = await fetchGoogleUserInfo(tokens.access_token);

    await prisma.usuario.update({
      where: { id: session.id },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        googleCalendarEmail: perfil.email,
      },
    });

    const res = NextResponse.redirect(`${url.origin}/configuracoes?tab=integracoes&calendario=conectado`);
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[auth/google-calendar/callback]", err);
    return falhar("google_erro");
  }
}
