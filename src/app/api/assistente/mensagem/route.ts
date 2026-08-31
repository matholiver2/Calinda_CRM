import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { gerarRespostaAssistente } from "@/lib/ai/assistenteEngine";
import { carregarHistoricoAssistente, salvarTurnoAssistente } from "@/lib/assistenteHistorico";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ erro: "Mensagem vazia" }, { status: 400 });
  }

  const [empresa, config, historico] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: ctx.empresaId }, select: { nome: true } }),
    prisma.configuracao.findUnique({
      where: { empresaId_chave: { empresaId: ctx.empresaId, chave: "empresa_sobre" } },
    }),
    carregarHistoricoAssistente(session.id, ctx.empresaId),
  ]);

  await salvarTurnoAssistente(session.id, ctx.empresaId, "usuario", texto);

  // Limita o histórico enviado à IA — chat de apoio não precisa do
  // contexto inteiro da conversa desde o início.
  const historicoRecente = [...historico, { autor: "usuario" as const, texto }].slice(-30);

  const resposta = await gerarRespostaAssistente(historicoRecente, {
    empresaNome: empresa?.nome ?? "sua empresa",
    empresaSobre: config?.valor ?? null,
    usuarioNome: session.nome.split(" ")[0],
  });

  await salvarTurnoAssistente(session.id, ctx.empresaId, "assistente", resposta);

  return NextResponse.json({ resposta });
}
