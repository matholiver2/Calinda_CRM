import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse } from "@/lib/apiAuth";
import { comparePassword, hashPassword } from "@/lib/auth";

/**
 * Altera a senha do usuário logado. Se a conta ainda não tem senha (criada
 * via login com Google), define a primeira senha sem exigir a atual.
 */
export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const senhaAtual = String(body?.senhaAtual ?? "");
  const novaSenha = String(body?.novaSenha ?? "");

  if (novaSenha.length < 6) {
    return NextResponse.json({ erro: "A nova senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.id } });

  if (usuario.senhaHash) {
    if (!senhaAtual) {
      return NextResponse.json({ erro: "Informe a senha atual" }, { status: 400 });
    }
    const ok = await comparePassword(senhaAtual, usuario.senhaHash);
    if (!ok) return NextResponse.json({ erro: "Senha atual incorreta" }, { status: 401 });
  }

  const novoHash = await hashPassword(novaSenha);
  await prisma.usuario.update({ where: { id: session.id }, data: { senhaHash: novoHash } });
  return NextResponse.json({ ok: true });
}
