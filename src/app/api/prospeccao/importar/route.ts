import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { normalizarTelefone } from "@/lib/utils";

type LeadParaImportar = {
  nome: string;
  telefone: string | null;
  endereco?: string | null;
};

/**
 * Importa os leads selecionados da busca de prospecção direto como Lead,
 * na primeira etapa do funil — sem disparar a primeira mensagem automática
 * (são contatos "frios" vindos do Google Maps, sem nenhum opt-in; mandar
 * mensagem automática pra eles seria spam. O vendedor decide manualmente
 * quando abordar). Pula duplicados (mesmo telefone já cadastrado).
 */
export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const leads = Array.isArray(body?.leads) ? (body.leads as LeadParaImportar[]) : [];
  if (leads.length === 0) return NextResponse.json({ erro: "Nenhum lead selecionado" }, { status: 400 });

  const primeiraEtapa = await prisma.etapaFunil.findFirst({
    where: { empresaId: ctx.empresaId, tipo: "funil" },
    orderBy: { ordem: "asc" },
  });
  if (!primeiraEtapa) {
    return NextResponse.json({ erro: "Nenhuma etapa de funil configurada" }, { status: 500 });
  }

  let importados = 0;
  let semTelefone = 0;
  let duplicados = 0;

  for (const item of leads) {
    const nome = String(item.nome ?? "").trim();
    const telefone = item.telefone ? normalizarTelefone(item.telefone) : "";
    if (!nome) continue;
    if (!telefone) {
      semTelefone++;
      continue;
    }

    try {
      const lead = await prisma.lead.create({
        data: {
          empresaId: ctx.empresaId,
          nome,
          telefone,
          origem: "Prospecção Google Maps",
          etapaAtualId: primeiraEtapa.id,
          iaAtiva: false,
          observacoes: item.endereco ? `Endereço: ${item.endereco}` : null,
        },
      });
      await prisma.historicoEtapa.create({
        data: { leadId: lead.id, etapaId: primeiraEtapa.id, motivoTransicao: "prospeccao_google_maps" },
      });
      importados++;
    } catch (err) {
      // P2002 = unique constraint (empresaId, telefone) — já existe, pula
      if ((err as { code?: string })?.code === "P2002") {
        duplicados++;
        continue;
      }
      throw err;
    }
  }

  return NextResponse.json({ importados, duplicados, semTelefone });
}
