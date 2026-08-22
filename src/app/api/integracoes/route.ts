import { NextResponse } from "next/server";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  return NextResponse.json({
    whatsapp: {
      provider: process.env.WHATSAPP_PROVIDER || "mock",
      configurado: process.env.WHATSAPP_PROVIDER === "meta" && !!process.env.WHATSAPP_TOKEN,
    },
    ia: {
      provider: "Google Gemini",
      configurado: !!process.env.GEMINI_API_KEY,
    },
    calendario: {
      provider: "Google Calendar",
      configurado: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    },
  });
}
