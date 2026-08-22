import { NextResponse } from "next/server";
import { googleConfigurado } from "@/lib/googleAuth";

// Endpoint público (sem sessão) — a tela de login precisa saber se deve
// mostrar o botão "Entrar com Google" antes de o usuário estar autenticado.
export async function GET() {
  return NextResponse.json({ configurado: googleConfigurado() });
}
