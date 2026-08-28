import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { gerarRespostaAssistente, type TurnoAssistente } from "@/lib/ai/assistenteEngine";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const historico = (Array.isArray(body?.historico) ? body.historico : []) as TurnoAssistente[];
  if (historico.length === 0 || historico[historico.length - 1]?.autor !== "usuario") {
    return NextResponse.json({ erro: "Histórico inválido" }, { status: 400 });
  }

  const [empresa, config] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: ctx.empresaId }, select: { nome: true } }),
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "empresa_sobre" } },
    }),
  ]);

  // Limita o histórico enviado à IA — chat de apoio não precisa do
  // contexto inteiro da conversa desde o início.
  const historicoRecente = historico.slice(-30);

  const resposta = await gerarRespostaAssistente(historicoRecente, {
    empresaNome: empresa?.nome ?? "sua empresa",
    empresaSobre: config?.valor ?? null,
    usuarioNome: session.nome.split(" ")[0],
  });

  return NextResponse.json({ resposta });
}
