import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, AUTH_COOKIE } from "@/lib/auth";
import { exchangeGoogleCode, fetchGoogleUserInfo, GOOGLE_STATE_COOKIE } from "@/lib/googleAuth";
import { resolverSessao } from "@/lib/session";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

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
      // Conta já existe — se tiver um convite pendente pra uma empresa em
      // que ela ainda não é membro, aceita automaticamente (mesma ideia do
      // fluxo por senha em /api/convites/publico/[token]/aceitar): permite
      // vincular o mesmo e-mail a outra empresa também por login Google.
      const membrosAtuais = await prisma.membroEmpresa.findMany({
        where: { usuarioId: usuario.id },
        select: { empresaId: true },
      });
      const empresasAtuais = new Set(membrosAtuais.map((m) => m.empresaId));
      const conviteNovo = await prisma.convite.findFirst({
        where: {
          email,
          status: "pendente",
          expiraEm: { gte: new Date() },
          empresaId: { notIn: [...empresasAtuais] },
        },
        orderBy: { criadoEm: "desc" },
      });
      if (conviteNovo?.empresaId) {
        await prisma.membroEmpresa.create({
          data: { usuarioId: usuario.id, empresaId: conviteNovo.empresaId, papel: conviteNovo.papel as "admin" | "gestor" | "vendedor" },
        });
        await prisma.convite.update({ where: { id: conviteNovo.id }, data: { status: "aceito" } });
      }
    } else {
      const convite = await prisma.convite.findFirst({
        where: { email, status: "pendente", expiraEm: { gte: new Date() } },
        orderBy: { criadoEm: "desc" },
      });
      if (!convite || !convite.empresaId) return falhar("nao_convidado");

      usuario = await prisma.usuario.create({
        data: {
          nome: perfil.name || email,
          email,
          googleId: perfil.sub,
          avatarCor: CORES[Math.floor(Math.random() * CORES.length)],
        },
      });
      await prisma.membroEmpresa.create({
        data: { usuarioId: usuario.id, empresaId: convite.empresaId, papel: convite.papel as "admin" | "gestor" | "vendedor" },
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

    const token = signToken({ id: usuario.id, nome: usuario.nome, email: usuario.email });
    const sessao = await resolverSessao({ id: usuario.id, nome: usuario.nome, email: usuario.email });
    if (!sessao) return falhar("conta_inativa");

    const destino = sessao.papel === "super_admin" ? "/empresas" : "/dashboard";
    const res = NextResponse.redirect(`${url.origin}${destino}`);
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    if (sessao.empresaId) {
      res.cookies.set(EMPRESA_ATIVA_COOKIE, sessao.empresaId, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return falhar("google_erro");
  }
}
