import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, AUTH_COOKIE } from "@/lib/auth";
import { exchangeGoogleCode, fetchGoogleUserInfo, GOOGLE_STATE_COOKIE } from "@/lib/googleAuth";

const CORES = ["#DC2626", "#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GOOGLE_STATE_COOKIE}=`))
    ?.split("=")[1];

  const falhar = (motivo: string) => NextResponse.redirect(`${url.origin}/login?erro=${motivo}`);

  if (!code || !state || !cookieState || state !== cookieState) {
    return falhar("google_estado_invalido");
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const perfil = await fetchGoogleUserInfo(tokens.access_token);

    if (!perfil.email_verified) return falhar("google_email_nao_verificado");
    const email = perfil.email.toLowerCase();

    let usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      if (!usuario.ativo) return falhar("conta_inativa");
      if (!usuario.googleId) {
        usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { googleId: perfil.sub } });
      }
    } else {
      const convite = await prisma.convite.findFirst({
        where: { email, status: "pendente", expiraEm: { gte: new Date() } },
        orderBy: { criadoEm: "desc" },
      });
      if (!convite) return falhar("nao_convidado");

      usuario = await prisma.usuario.create({
        data: {
          nome: perfil.name || email,
          email,
          googleId: perfil.sub,
          papel: convite.papel,
          empresaId: convite.empresaId,
          avatarCor: CORES[Math.floor(Math.random() * CORES.length)],
        },
      });
      await prisma.convite.update({ where: { id: convite.id }, data: { status: "aceito" } });
    }

    // O login já pede o escopo do Calendar (ver GOOGLE_CALENDAR_SCOPE em
    // googleAuth.ts) — a mesma troca de código acima cobre identidade e
    // calendário, sem precisar de um segundo consentimento.
    if (tokens.refresh_token) {
      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarRefreshToken: tokens.refresh_token,
          googleCalendarTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          googleCalendarEmail: email,
        },
      });
    }

    const token = signToken({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
    });

    const destino = usuario.papel === "super_admin" ? "/empresas" : "/dashboard";
    const res = NextResponse.redirect(`${url.origin}${destino}`);
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return falhar("google_erro");
  }
}
