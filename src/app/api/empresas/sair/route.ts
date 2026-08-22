import { NextResponse } from "next/server";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";
import { EMPRESA_ATIVA_COOKIE } from "@/lib/tenant";

export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(EMPRESA_ATIVA_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
