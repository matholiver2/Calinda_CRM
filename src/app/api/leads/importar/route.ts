import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { normalizarTelefone } from "@/lib/utils";
import { dispararPrimeiraMensagem } from "@/lib/conversationService";

type LinhaImportacao = {
  nome?: string;
  telefone?: string;
  email?: string | null;
  origem?: string | null;
  observacoes?: string | null;
};

/**
 * Importação em lote de leads/clientes via planilha (CSV, parseado no
 * navegador — ver src/lib/csvImport.ts). status "cliente" é usado quando a
 * pessoa está subindo a carteira de clientes já existente, não leads novos
 * pro funil. iniciarComIa fica desligado por padrão igual à prospecção
 * (contatos importados em massa não deram opt-in nenhum pra IA já começar
 * conversando — fica a critério de quem importou).
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const linhas = Array.isArray(body?.leads) ? (body.leads as LinhaImportacao[]) : [];
  const status = body?.status === "cliente" ? "cliente" : "ativo";
  const iniciarComIa = body?.iniciarComIa === true;

  if (linhas.length === 0) return NextResponse.json({ erro: "Nenhuma linha pra importar" }, { status: 400 });
  if (linhas.length > 2000) return NextResponse.json({ erro: "Máximo de 2000 linhas por importação" }, { status: 400 });

  const primeiraEtapa = await prisma.etapaFunil.findFirst({
    where: { empresaId: ctx.empresaId, tipo: "funil" },
    orderBy: { ordem: "asc" },
  });
  if (!primeiraEtapa) {
    return NextResponse.json({ erro: "Nenhuma etapa de funil configurada" }, { status: 500 });
  }

  let importados = 0;
  let duplicados = 0;
  let invalidos = 0;
  const idsCriados: string[] = [];

  for (const linha of linhas) {
    const nome = String(linha.nome ?? "").trim();
    const telefone = normalizarTelefone(String(linha.telefone ?? ""));
    if (!nome || !telefone) {
      invalidos++;
      continue;
    }

    try {
      const lead = await prisma.lead.create({
        data: {
          empresaId: ctx.empresaId,
          nome,
          telefone,
          email: linha.email?.trim() || null,
          origem: linha.origem?.trim() || "Importação de planilha",
          observacoes: linha.observacoes?.trim() || null,
          status,
          etapaAtualId: primeiraEtapa.id,
          iaAtiva: iniciarComIa,
        },
      });
      await prisma.historicoEtapa.create({
        data: { leadId: lead.id, etapaId: primeiraEtapa.id, motivoTransicao: "importacao_planilha" },
      });
      idsCriados.push(lead.id);
      importados++;
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") {
        duplicados++;
        continue;
      }
      throw err;
    }
  }

  // Dispara a primeira mensagem só depois de criar todo mundo — se a IA
  // estiver ligada pro lote, evita misturar a criação em massa com chamadas
  // de IA uma a uma no meio do loop (mais previsível se algo falhar no meio).
  if (iniciarComIa) {
    for (const id of idsCriados) {
      try {
        await dispararPrimeiraMensagem(id);
      } catch (err) {
        console.error("[leads/importar] falha ao disparar primeira mensagem pro lead", id, err);
      }
    }
  }

  return NextResponse.json({ importados, duplicados, invalidos });
}
