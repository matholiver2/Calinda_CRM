import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildGoogleAuthUrl, googleConfigurado, GOOGLE_STATE_COOKIE } from "@/lib/googleAuth";

export async function GET(req: Request) {
  if (!googleConfigurado()) {
    return NextResponse.json({ erro: "Login com Google não configurado" }, { status: 501 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  const res = NextResponse.redirect(
    buildGoogleAuthUrl(state, redirectUri, { prompt: "select_account consent" })
  );
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
