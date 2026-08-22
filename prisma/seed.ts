import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const diasAtras = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const horasAtras = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);

async function main() {
  console.log("Limpando banco...");
  await prisma.mensagem.deleteMany();
  await prisma.reuniao.deleteMany();
  await prisma.historicoEtapa.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.agenteIa.deleteMany();
  await prisma.etapaFunil.deleteMany();
  await prisma.convite.deleteMany();
  await prisma.configuracao.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.empresa.deleteMany();

  const senhaHash = await bcrypt.hash("calinda123", 10);
  const senhaSuperAdmin = await bcrypt.hash("calinda@12", 10);

  console.log("Criando super admin...");
  await prisma.usuario.create({
    data: {
      nome: "Super Admin",
      email: "admin@calinda.com",
      senhaHash: senhaSuperAdmin,
      papel: "super_admin",
      avatarCor: "#DC2626",
      empresaId: null,
    },
  });

  console.log("Criando empresa CALINDA (demo principal)...");
  const calinda = await prisma.empresa.create({ data: { nome: "CALINDA" } });

  const admin = await prisma.usuario.create({
    data: { nome: "Marina Assiz", email: "admin@calinda-demo.com", senhaHash, papel: "admin", avatarCor: "#DC2626", empresaId: calinda.id },
  });
  await prisma.usuario.create({
    data: { nome: "Rafael Duarte", email: "gestor@calinda-demo.com", senhaHash, papel: "gestor", avatarCor: "#2563EB", empresaId: calinda.id },
  });
  const vendedor1 = await prisma.usuario.create({
    data: { nome: "Camila Rocha", email: "camila@calinda-demo.com", senhaHash, papel: "vendedor", avatarCor: "#059669", empresaId: calinda.id },
  });
  const vendedor2 = await prisma.usuario.create({
    data: { nome: "Bruno Alves", email: "bruno@calinda-demo.com", senhaHash, papel: "vendedor", avatarCor: "#D97706", empresaId: calinda.id },
  });

  console.log("Criando etapas do funil (CALINDA)...");
  const etapaNovoLead = await prisma.etapaFunil.create({
    data: { empresaId: calinda.id, nome: "Novo Lead", ordem: 1, cor: "#F87171", tipo: "funil",
      descricaoObjetivo: "Primeiro contato e abertura de conversa." },
  });
  const etapaPrimeiraResposta = await prisma.etapaFunil.create({
    data: { empresaId: calinda.id, nome: "1ª Resposta", ordem: 2, cor: "#FB923C", tipo: "funil",
      descricaoObjetivo: "Entender a dor do lead e o contexto atual." },
  });
  const etapaQualificando = await prisma.etapaFunil.create({
    data: { empresaId: calinda.id, nome: "Qualificando", ordem: 3, cor: "#FBBF24", tipo: "funil",
      descricaoObjetivo: "Validar fit e propor reunião com o time comercial." },
  });
  const etapaReuniaoAgendada = await prisma.etapaFunil.create({
    data: { empresaId: calinda.id, nome: "Reunião Agendada", ordem: 4, cor: "#34D399", tipo: "funil", handoffHumano: true,
      descricaoObjetivo: "Reunião marcada — vendedor assume a conversa." },
  });
  const etapaRemarketing = await prisma.etapaFunil.create({
    data: { empresaId: calinda.id, nome: "Remarketing", ordem: 99, cor: "#A78BFA", tipo: "remarketing",
      descricaoObjetivo: "Reengajar leads que não fecharam após a reunião." },
  });

  console.log("Criando agentes de IA (CALINDA)...");
  await prisma.agenteIa.createMany({
    data: [
      {
        empresaId: calinda.id,
        nome: "Agente de Recepção",
        persona: "Você é a Cali, assistente virtual da CALINDA, uma empresa de software B2B para times de vendas. Tom simpático, direto e consultivo.",
        objetivo: "Dar boas-vindas ao lead e entender qual problema ele quer resolver.",
        etapaId: etapaNovoLead.id,
        modeloLlm: "claude-sonnet",
      },
      {
        empresaId: calinda.id,
        nome: "Agente de Descoberta",
        persona: "Você é a Cali, assistente virtual da CALINDA. Tom simpático, direto e consultivo.",
        objetivo: "Entender o cenário atual do lead (ferramentas, time, dores) sem soar como um formulário.",
        etapaId: etapaPrimeiraResposta.id,
        modeloLlm: "claude-sonnet",
      },
      {
        empresaId: calinda.id,
        nome: "Agente de Qualificação",
        persona: "Você é a Cali, assistente virtual da CALINDA. Tom simpático, direto e consultivo.",
        objetivo: "Validar se o lead tem fit com a solução e propor ativamente uma reunião com um consultor.",
        etapaId: etapaQualificando.id,
        modeloLlm: "claude-sonnet",
      },
    ],
  });

  await prisma.configuracao.create({ data: { empresaId: calinda.id, chave: "leads_parados_dias", valor: "3" } });

  console.log("Criando leads de exemplo (CALINDA)...");

  type LeadSeed = {
    nome: string;
    telefone: string;
    email?: string;
    origem: string;
    etapa: typeof etapaNovoLead;
    status?: "ativo" | "cliente" | "perdido" | "remarketing";
    iaAtiva?: boolean;
    vendedorId?: string;
    entrouEm: Date;
    mensagens: { remetente: "lead" | "ia" | "vendedor"; conteudo: string; enviadoEm: Date }[];
  };

  const leadsSeed: LeadSeed[] = [
    {
      nome: "João Pedro Martins",
      telefone: "+5511988001001",
      email: "joaopedro@empresa.com",
      origem: "Instagram Ads",
      etapa: etapaNovoLead,
      entrouEm: horasAtras(2),
      mensagens: [
        { remetente: "ia", conteudo: "Oi, João! Tudo bem? Vi que você se interessou pela CALINDA — posso te fazer 2 perguntas rápidas?", enviadoEm: horasAtras(2) },
      ],
    },
    {
      nome: "Fernanda Lima",
      telefone: "+5511988001002",
      email: "fernanda.lima@gmail.com",
      origem: "Google Ads",
      etapa: etapaNovoLead,
      entrouEm: diasAtras(4),
      mensagens: [
        { remetente: "ia", conteudo: "Olá, Fernanda! Que bom falar com você. Qual o principal desafio que você quer resolver hoje?", enviadoEm: diasAtras(4) },
      ],
    },
    {
      nome: "Carlos Eduardo Souza",
      telefone: "+5511988001003",
      origem: "Indicação",
      etapa: etapaPrimeiraResposta,
      entrouEm: diasAtras(1),
      mensagens: [
        { remetente: "ia", conteudo: "Oi, Carlos! Tudo bem? Posso te fazer 2 perguntas rápidas?", enviadoEm: diasAtras(1) },
        { remetente: "lead", conteudo: "Pode sim! Hoje a gente perde muito tempo com follow-up manual.", enviadoEm: horasAtras(20) },
        { remetente: "ia", conteudo: "Entendi! E hoje vocês já usam alguma ferramenta pra isso, ou seria o primeiro contato com esse tipo de solução?", enviadoEm: horasAtras(19) },
      ],
    },
    {
      nome: "Beatriz Nogueira",
      telefone: "+5511988001004",
      email: "bia.nogueira@startup.io",
      origem: "Instagram Ads",
      etapa: etapaPrimeiraResposta,
      entrouEm: diasAtras(6),
      mensagens: [
        { remetente: "ia", conteudo: "Olá, Beatriz! Qual o principal desafio que você quer resolver hoje?", enviadoEm: diasAtras(6) },
        { remetente: "lead", conteudo: "Nosso funil tá bagunçado, sem organização nenhuma.", enviadoEm: diasAtras(6) },
      ],
    },
    {
      nome: "Ricardo Tavares",
      telefone: "+5511988001005",
      origem: "Google Ads",
      etapa: etapaQualificando,
      entrouEm: diasAtras(2),
      mensagens: [
        { remetente: "lead", conteudo: "A gente é um time de 8 vendedores.", enviadoEm: diasAtras(2) },
        { remetente: "ia", conteudo: "Faz total sentido pro que vocês precisam. Consigo te mostrar isso numa reunião rápida — prefere de manhã ou à tarde?", enviadoEm: diasAtras(2) },
        { remetente: "lead", conteudo: "De manhã é melhor pra mim.", enviadoEm: horasAtras(10) },
      ],
    },
    {
      nome: "Patrícia Gomes",
      telefone: "+5511988001006",
      email: "patricia.gomes@comercio.com",
      origem: "Indicação",
      etapa: etapaQualificando,
      entrouEm: diasAtras(3),
      mensagens: [
        { remetente: "lead", conteudo: "Temos uns 15 vendedores espalhados em 3 filiais.", enviadoEm: diasAtras(3) },
        { remetente: "ia", conteudo: "Show! Acho que temos um bom encaixe. Que tal marcarmos uma conversa rápida essa semana?", enviadoEm: diasAtras(3) },
      ],
    },
    {
      nome: "Diego Fernandes",
      telefone: "+5511988001007",
      origem: "Google Ads",
      etapa: etapaReuniaoAgendada,
      status: "ativo",
      iaAtiva: false,
      vendedorId: vendedor1.id,
      entrouEm: diasAtras(1),
      mensagens: [
        { remetente: "lead", conteudo: "Pode ser sim, fechado!", enviadoEm: diasAtras(1) },
        { remetente: "ia", conteudo: "Perfeito! Já vou registrar aqui e um dos nossos consultores confirma o horário com você em instantes. Até já!", enviadoEm: diasAtras(1) },
        { remetente: "vendedor", conteudo: "Oi, Diego! Aqui é a Camila da CALINDA, vou te acompanhar a partir de agora. Confirmando nossa reunião amanhã às 10h, combinado?", enviadoEm: horasAtras(18) },
      ],
    },
    {
      nome: "Larissa Prado",
      telefone: "+5511988001008",
      email: "larissa.prado@varejo.com",
      origem: "Instagram Ads",
      etapa: etapaReuniaoAgendada,
      status: "ativo",
      iaAtiva: false,
      vendedorId: vendedor2.id,
      entrouEm: diasAtras(5),
      mensagens: [
        { remetente: "lead", conteudo: "Combinado, terça às 14h funciona bem.", enviadoEm: diasAtras(5) },
        { remetente: "vendedor", conteudo: "Fechado, Larissa! Te mando o link agora.", enviadoEm: diasAtras(5) },
      ],
    },
    {
      nome: "Marcelo Andrade",
      telefone: "+5511988001009",
      origem: "Google Ads",
      etapa: etapaRemarketing,
      status: "remarketing",
      iaAtiva: true,
      vendedorId: vendedor1.id,
      entrouEm: diasAtras(10),
      mensagens: [
        { remetente: "vendedor", conteudo: "Marcelo, valeu pelo papo semana passada! Ficou alguma dúvida sobre a proposta?", enviadoEm: diasAtras(8) },
        { remetente: "ia", conteudo: "Oi, Marcelo! Passando pra saber se ainda faz sentido a gente retomar a conversa sobre a CALINDA 🙂", enviadoEm: diasAtras(2) },
      ],
    },
    {
      nome: "Juliana Prado",
      telefone: "+5511988001010",
      origem: "Indicação",
      etapa: etapaNovoLead,
      status: "perdido",
      iaAtiva: false,
      entrouEm: diasAtras(7),
      mensagens: [
        { remetente: "ia", conteudo: "Olá, Juliana! Tudo bem? Posso te fazer 2 perguntas rápidas?", enviadoEm: diasAtras(7) },
        { remetente: "lead", conteudo: "Não tenho interesse, obrigada.", enviadoEm: diasAtras(7) },
        { remetente: "ia", conteudo: "Sem problemas, obrigado pelo retorno! Vou deixar de te enviar mensagens por aqui.", enviadoEm: diasAtras(7) },
      ],
    },
    {
      nome: "André Barbosa",
      telefone: "+5511988001011",
      origem: "Google Ads",
      etapa: etapaNovoLead,
      entrouEm: diasAtras(9),
      mensagens: [
        { remetente: "ia", conteudo: "Oi, André! Vi que você se interessou pela CALINDA — posso te fazer 2 perguntas rápidas?", enviadoEm: diasAtras(9) },
      ],
    },
    {
      nome: "Simone Castro",
      telefone: "+5511988001012",
      email: "simone.castro@industria.com",
      origem: "Instagram Ads",
      etapa: etapaPrimeiraResposta,
      entrouEm: diasAtras(1),
      mensagens: [
        { remetente: "ia", conteudo: "Olá, Simone! Qual o principal desafio que você quer resolver hoje?", enviadoEm: diasAtras(1) },
        { remetente: "lead", conteudo: "Hoje é tudo em planilha, é um caos.", enviadoEm: horasAtras(12) },
      ],
    },
  ];

  for (const l of leadsSeed) {
    const lead = await prisma.lead.create({
      data: {
        empresaId: calinda.id,
        nome: l.nome,
        telefone: l.telefone,
        email: l.email,
        origem: l.origem,
        etapaAtualId: l.etapa.id,
        status: l.status ?? "ativo",
        iaAtiva: l.iaAtiva ?? true,
        vendedorId: l.vendedorId,
        entrouEm: l.entrouEm,
      },
    });

    await prisma.historicoEtapa.create({
      data: { leadId: lead.id, etapaId: l.etapa.id, entrouEm: l.entrouEm, motivoTransicao: "criacao_lead" },
    });

    for (const m of l.mensagens) {
      await prisma.mensagem.create({
        data: {
          leadId: lead.id,
          remetente: m.remetente,
          conteudo: m.conteudo,
          enviadoEm: m.enviadoEm,
          statusEntrega: "lido",
          vendedorId: m.remetente === "vendedor" ? l.vendedorId : undefined,
        },
      });
    }
  }

  console.log("Criando reuniões de exemplo (CALINDA)...");
  const diego = await prisma.lead.findFirst({ where: { telefone: "+5511988001007" } });
  const larissa = await prisma.lead.findFirst({ where: { telefone: "+5511988001008" } });

  if (diego) {
    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + 1);
    dataHora.setHours(10, 0, 0, 0);
    await prisma.reuniao.create({
      data: { leadId: diego.id, vendedorId: vendedor1.id, dataHora, status: "confirmada", resultado: "pendente" },
    });
  }
  if (larissa) {
    const dataHora = diasAtras(1);
    dataHora.setHours(14, 0, 0, 0);
    await prisma.reuniao.create({
      data: { leadId: larissa.id, vendedorId: vendedor2.id, dataHora, status: "realizada", resultado: "nao_fechou" },
    });
  }

  console.log("Criando convite pendente de exemplo (CALINDA)...");
  await prisma.convite.create({
    data: {
      email: "novo.vendedor@calinda-demo.com",
      papel: "vendedor",
      empresaId: calinda.id,
      token: "demo-convite-calinda-001",
      convidadoPorId: admin.id,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Criando segunda empresa (Acme Vendas) para demonstrar isolamento multi-tenant...");
  const acme = await prisma.empresa.create({ data: { nome: "Acme Vendas" } });
  const acmeAdmin = await prisma.usuario.create({
    data: { nome: "Paulo Acme", email: "admin@acme-demo.com", senhaHash, papel: "admin", avatarCor: "#0EA5E9", empresaId: acme.id },
  });
  const acmeEtapaNovo = await prisma.etapaFunil.create({
    data: { empresaId: acme.id, nome: "Novo Lead", ordem: 1, cor: "#F87171", tipo: "funil", descricaoObjetivo: "Primeiro contato." },
  });
  await prisma.etapaFunil.create({
    data: { empresaId: acme.id, nome: "Reunião Agendada", ordem: 2, cor: "#34D399", tipo: "funil", handoffHumano: true, descricaoObjetivo: "Reunião marcada." },
  });
  await prisma.agenteIa.create({
    data: {
      empresaId: acme.id,
      nome: "Agente de Recepção",
      persona: "Você é o assistente virtual da Acme Vendas.",
      objetivo: "Dar boas-vindas ao lead e entender o que ele precisa.",
      etapaId: acmeEtapaNovo.id,
    },
  });
  await prisma.configuracao.create({ data: { empresaId: acme.id, chave: "leads_parados_dias", valor: "5" } });
  const acmeLead = await prisma.lead.create({
    data: {
      empresaId: acme.id,
      nome: "Cliente Teste Acme",
      telefone: "+5521977002001",
      origem: "Site",
      etapaAtualId: acmeEtapaNovo.id,
    },
  });
  await prisma.historicoEtapa.create({
    data: { leadId: acmeLead.id, etapaId: acmeEtapaNovo.id, motivoTransicao: "criacao_lead" },
  });
  await prisma.mensagem.create({
    data: { leadId: acmeLead.id, remetente: "ia", conteudo: "Olá! Bem-vindo à Acme Vendas, como posso ajudar?", statusEntrega: "enviado" },
  });

  console.log("Seed concluído.\n");
  console.log("Login super admin (vê todas as empresas):");
  console.log("  admin@calinda.com / senha: calinda@12\n");
  console.log("Login empresa CALINDA (senha: calinda123):");
  console.log("  admin@calinda-demo.com / gestor@calinda-demo.com / camila@calinda-demo.com / bruno@calinda-demo.com\n");
  console.log("Login empresa Acme Vendas (senha: calinda123):");
  console.log("  admin@acme-demo.com");
  void acmeAdmin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
