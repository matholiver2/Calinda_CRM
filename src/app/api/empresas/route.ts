import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";

export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const empresas = await prisma.empresa.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { usuarios: true, leads: true } } },
  });
  return NextResponse.json({ empresas });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return NextResponse.json({ erro: "Nome da empresa é obrigatório" }, { status: 400 });

  const empresa = await prisma.empresa.create({ data: { nome } });

  // Funil e agentes padrão do sistema — toda empresa nova já nasce com o
  // fluxo básico funcionando (não depende do onboarding pra ter algo real).
  // O onboarding, quando feito, só refina esses agentes pro negócio específico.
  const PERSONA_PADRAO = "Você é o assistente virtual desta empresa, atencioso e direto ao ponto.";
  const ETAPAS_PADRAO = [
    {
      nome: "Novo Lead",
      ordem: 1,
      cor: "#F87171",
      tipo: "funil" as const,
      descricaoObjetivo: "Primeiro contato e abertura de conversa.",
      agenteNome: "Agente de Recepção",
      agenteObjetivo: "Dar boas-vindas ao lead e entender rapidamente o que ele está buscando.",
    },
    {
      nome: "1ª Resposta",
      ordem: 2,
      cor: "#FBBF24",
      tipo: "funil" as const,
      descricaoObjetivo: "Entender a dor do lead e o contexto antes de avançar.",
      agenteNome: "Agente de Qualificação",
      agenteObjetivo: "Aprofundar o entendimento da necessidade do lead e qualificar se faz sentido seguir.",
    },
    {
      nome: "Reunião Agendada",
      ordem: 3,
      cor: "#34D399",
      tipo: "funil" as const,
      descricaoObjetivo: "Confirmar interesse e propor reunião com um vendedor.",
      agenteNome: "Agente de Fechamento",
      agenteObjetivo: "Confirmar o interesse do lead e propor um horário de reunião com um vendedor.",
    },
    {
      nome: "Remarketing",
      ordem: 99,
      cor: "#A78BFA",
      tipo: "remarketing" as const,
      descricaoObjetivo: "Reengajar leads que não fecharam.",
      agenteNome: "Agente de Remarketing",
      agenteObjetivo:
        "Reengajar o lead que não fechou, com base no histórico da conversa, oferecendo algo novo ou perguntando se ainda tem interesse.",
    },
    {
      nome: "Finalizado",
      ordem: 100,
      cor: "#94A3B8",
      tipo: "finalizado" as const,
      descricaoObjetivo: "Fim natural da conversa — a IA já fez o que podia fazer.",
      // Sem agente: aqui não tem conversa livre, só a mensagem de
      // finalização configurada (Configurar IA), disparada automaticamente
      // ao entrar nessa etapa — ver dispararMensagemFinalizacao.
      agenteNome: null,
      agenteObjetivo: null,
    },
  ];

  for (const etapaPadrao of ETAPAS_PADRAO) {
    const etapa = await prisma.etapaFunil.create({
      data: {
        empresaId: empresa.id,
        nome: etapaPadrao.nome,
        ordem: etapaPadrao.ordem,
        cor: etapaPadrao.cor,
        tipo: etapaPadrao.tipo,
        descricaoObjetivo: etapaPadrao.descricaoObjetivo,
      },
    });
    if (etapaPadrao.agenteNome && etapaPadrao.agenteObjetivo) {
      await prisma.agenteIa.create({
        data: {
          empresaId: empresa.id,
          etapaId: etapa.id,
          nome: etapaPadrao.agenteNome,
          persona: PERSONA_PADRAO,
          objetivo: etapaPadrao.agenteObjetivo,
          modeloLlm: "gemini-3.6-flash",
        },
      });
    }
  }

  await prisma.configuracao.create({ data: { empresaId: empresa.id, chave: "leads_parados_dias", valor: "3" } });
  await prisma.configuracao.create({
    data: {
      empresaId: empresa.id,
      chave: "primeira_mensagem_template",
      valor: `Olá, {nome}! Aqui é da {empresa}. Vi seu interesse e adorei poder te ajudar — me conta rapidinho: qual é o principal desafio que você quer resolver hoje?`,
    },
  });

  return NextResponse.json({ empresa }, { status: 201 });
}
