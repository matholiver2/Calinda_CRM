import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarMensagemRecebida } from "@/lib/conversationService";
import { normalizarTelefone } from "@/lib/utils";

/**
 * Endpoint de recebimento de mensagens/eventos do provedor de WhatsApp
 * (seção 4.3 do descritivo técnico). Não requer sessão de usuário — é
 * chamado pelo provedor (Meta Cloud API / Twilio / Z-API) ou pelo
 * whatsapp-worker (integração não-oficial via Baileys), autenticado por
 * secret compartilhado (header x-worker-secret).
 *
 * Formato aceito aqui é um payload normalizado { empresaId, telefone, texto, nome? }.
 * Em produção com Meta Cloud API, o `empresaId` seria resolvido a partir do
 * phone_number_id que recebeu a mensagem; adapte o parsing conforme o
 * payload específico do provedor antes de repassar para o motor de automação.
 */
export async function POST(req: Request) {
  const secretEsperado = process.env.WHATSAPP_WORKER_SECRET;
  if (secretEsperado && req.headers.get("x-worker-secret") !== secretEsperado) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const empresaId = String(body?.empresaId ?? "").trim();
  const telefone = normalizarTelefone(String(body?.telefone ?? ""));
  const texto = String(body?.texto ?? "").trim();
  const nome = body?.nome ? String(body.nome).trim() : null;

  if (!empresaId || !telefone || !texto) {
    return NextResponse.json({ erro: "empresaId, telefone e texto são obrigatórios" }, { status: 400 });
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa || !empresa.ativo) {
    return NextResponse.json({ erro: "Empresa inválida" }, { status: 404 });
  }

  let lead = await prisma.lead.findUnique({
    where: { empresaId_telefone: { empresaId, telefone } },
  });

  if (!lead) {
    const primeiraEtapa = await prisma.etapaFunil.findFirst({
      where: { empresaId, tipo: "funil" },
      orderBy: { ordem: "asc" },
    });
    if (!primeiraEtapa) {
      return NextResponse.json({ erro: "Nenhuma etapa de funil configurada para esta empresa" }, { status: 500 });
    }
    lead = await prisma.lead.create({
      data: {
        empresaId,
        nome: nome ?? `Lead ${telefone}`,
        telefone,
        origem: "WhatsApp",
        etapaAtualId: primeiraEtapa.id,
      },
    });
    await prisma.historicoEtapa.create({
      data: { leadId: lead.id, etapaId: primeiraEtapa.id, motivoTransicao: "criacao_lead" },
    });
  }

  const resultado = await processarMensagemRecebida(lead.id, texto);
  return NextResponse.json({ ok: true, leadId: lead.id, ...resultado });
}
