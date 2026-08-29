import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

// `id` aqui é o MembroEmpresa.id (vínculo dessa conta com esta empresa) —
// não o Usuario.id, já que uma conta pode ter vínculos com várias empresas.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const { id } = await params;
  const alvo = await prisma.membroEmpresa.findUnique({ where: { id }, include: { usuario: true } });
  if (!alvo || alvo.empresaId !== ctx.empresaId) {
    return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  }
  if (alvo.usuarioId === session.id) {
    return NextResponse.json({ erro: "Use \"Minha conta\" para alterar o próprio usuário" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  if (typeof body?.nome === "string" && body.nome.trim()) {
    await prisma.usuario.update({ where: { id: alvo.usuarioId }, data: { nome: body.nome.trim() } });
  }

  const membro = await prisma.membroEmpresa.update({
    where: { id },
    data: { papel: body?.papel, ativo: body?.ativo },
    include: { usuario: { select: { nome: true, email: true, avatarCor: true } } },
  });

  return NextResponse.json({
    usuario: {
      id: membro.id,
      nome: membro.usuario.nome,
      email: membro.usuario.email,
      papel: membro.papel,
      ativo: membro.ativo,
      avatarCor: membro.usuario.avatarCor,
    },
  });
}
