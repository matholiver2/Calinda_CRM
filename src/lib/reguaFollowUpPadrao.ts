// Modelo padrão de régua de relacionamento — adaptado de uma régua real de
// 8 modalidades de follow-up (originalmente de uma empresa de mídia OOH),
// generalizado pra qualquer área de negócio que venda por contrato/recorrência.
// Usado só como ponto de partida: "Carregar modelo padrão" em /follow-up
// cria esses tipos+marcos pra empresa editar/apagar/ajustar à vontade.

export type ChaveTipoPadrao =
  | "MSG"
  | "REL_VIS"
  | "LIG"
  | "VIS"
  | "REL_ATU"
  | "LIG_EST"
  | "AGE_REN"
  | "REU_REN";

export const TIPOS_PADRAO: {
  chave: ChaveTipoPadrao;
  nome: string;
  canal: "automatico" | "manual";
  objetivo: string;
  scriptModelo: string;
}[] = [
  {
    chave: "MSG",
    nome: "Mensagem de acompanhamento",
    canal: "automatico",
    objetivo: "Checagem ágil de alinhamento e presença ativa — contato leve, sem compromisso.",
    scriptModelo:
      "Olá, {nome}! Tudo bem? Passando rapidinho pra saber como estão as coisas por aí e se precisa de algum ajuste ou tem alguma dúvida sobre o que está em andamento com a {empresa}. Estamos à disposição!",
  },
  {
    chave: "REL_VIS",
    nome: "Relatório de Resultados",
    canal: "automatico",
    objetivo: "Mostrar entregas/resultados recentes com comprovação (print, foto, número), reforçando valor percebido.",
    scriptModelo:
      "Olá, {nome}! Tudo ótimo por aí? Segue um resumo rápido do que entregamos nesse período, com os principais números do ciclo. Qualquer dúvida sobre os resultados, é só chamar!",
  },
  {
    chave: "LIG",
    nome: "Ligação de Relacionamento",
    canal: "manual",
    objetivo: "Contato humano rápido (3 a 5 min) pra ouvir feedback e estreitar a relação.",
    scriptModelo:
      "ROTEIRO DA LIGAÇÃO:\n1. Abertura: \"Oi, {nome}, tudo bem? Aqui é [seu nome] da {empresa}. Tem 2 minutinhos?\"\n2. Pergunta-chave: \"Queria entender como está sua percepção do que estamos entregando — algum retorno ou feedback recente?\"\n3. Checagem: \"Está tudo certo do lado de vocês? Precisam de algum ajuste?\"\n4. Encerramento: \"Perfeito, {nome}. Qualquer coisa estamos à disposição. Abraço!\"",
  },
  {
    chave: "VIS",
    nome: "Visita Presencial",
    canal: "manual",
    objetivo: "Consolidar autoridade e relacionamento com o decisor, presencialmente.",
    scriptModelo:
      "ESTRUTURA DA VISITA:\nPasso 1 (agendar via WhatsApp): \"Olá {nome}, na próxima [dia] vou passar pela região — posso te visitar por 15 minutos pra ver como estão as coisas?\"\nPasso 2 (na visita): cumprimentar a equipe/decisor, perguntar sobre as metas atuais, mostrar a evolução do trabalho, validar se está tudo alinhado com o momento do cliente.\nPasso 3 (pós-visita): mandar mensagem agradecendo a recepção e resumindo o que foi combinado.",
  },
  {
    chave: "REL_ATU",
    nome: "Relatório + Atualizações",
    canal: "automatico",
    objetivo: "Balanço mais robusto do período, somado a novidades da empresa que reforcem a parceria.",
    scriptModelo:
      "Prezado(a) {nome}, tudo bem? Elaboramos um relatório mais completo do último ciclo junto com novidades da {empresa} que podem te interessar. Qualquer dúvida, estamos à disposição pra esclarecer.",
  },
  {
    chave: "LIG_EST",
    nome: "Ligação Estratégica",
    canal: "manual",
    objetivo: "Alinhamento com o decisor sobre metas de negócio e próximos passos — mais consultivo que operacional.",
    scriptModelo:
      "ROTEIRO DA LIGAÇÃO ESTRATÉGICA:\n1. Abertura: \"Oi {nome}, aqui é [seu nome] da {empresa}. Reservei esse horário pro nosso alinhamento.\"\n2. Diagnóstico: \"Como tem sido o resultado nesse período? Quais as metas prioritárias pros próximos meses?\"\n3. Posicionamento: \"Queremos garantir que vocês continuem tendo os melhores resultados com a gente.\"\n4. Encaminhamento: \"Vamos desenhar os próximos passos com base no que conversamos.\"",
  },
  {
    chave: "AGE_REN",
    nome: "Agendamento de Renovação",
    canal: "automatico",
    objetivo: "Antecipar o fechamento da renovação (15 a 30 dias antes do vencimento), evitando gap de faturamento.",
    scriptModelo:
      "Olá, {nome}! O ciclo atual com a {empresa} está se aproximando do fim. Queremos agendar uma conversa rápida de 15 minutos pra apresentar os resultados e organizar a continuidade da parceria. Qual dia fica melhor pra você?",
  },
  {
    chave: "REU_REN",
    nome: "Reunião de Renovação",
    canal: "manual",
    objetivo: "Fechar a renovação com retrospectiva de resultados e apresentação da nova proposta.",
    scriptModelo:
      "ROTEIRO DA REUNIÃO:\n1. Retrospectiva: resumo do período, resultados e impacto gerado.\n2. Alinhamento de metas: perguntar quais são os próximos objetivos do cliente.\n3. Proposta: apresentar a renovação (mantendo condições ou propondo upgrade).\n4. Fechamento: reforçar os benefícios de renovar agora, sem interrupção do que já está rodando.",
  },
];

type Periodicidade = "trimestral" | "semestral" | "anual";
type Perfil = "a" | "b" | "c";

/** [perfil][periodicidade] = lista de (diaOffset, chave do tipo) — transcrito da régua original de referência. */
export const REGUA_PADRAO: Record<Perfil, Record<Periodicidade, [number, ChaveTipoPadrao][]>> = {
  a: {
    trimestral: [
      [15, "MSG"], [30, "REL_VIS"], [45, "LIG"], [60, "VIS"], [75, "AGE_REN"], [90, "REU_REN"],
    ],
    semestral: [
      [15, "MSG"], [30, "REL_VIS"], [45, "LIG"], [60, "VIS"], [90, "REL_ATU"], [120, "LIG_EST"], [150, "AGE_REN"], [180, "REU_REN"],
    ],
    anual: [
      [15, "MSG"], [30, "REL_VIS"], [60, "LIG"], [90, "VIS"], [120, "REL_ATU"], [150, "LIG_EST"], [180, "REL_VIS"],
      [210, "VIS"], [240, "LIG"], [270, "REL_VIS"], [300, "MSG"], [330, "AGE_REN"], [365, "REU_REN"],
    ],
  },
  b: {
    trimestral: [
      [15, "MSG"], [30, "REL_VIS"], [60, "VIS"], [75, "AGE_REN"], [90, "REU_REN"],
    ],
    semestral: [
      [15, "MSG"], [30, "REL_VIS"], [60, "LIG"], [90, "VIS"], [120, "REL_ATU"], [150, "AGE_REN"], [180, "REU_REN"],
    ],
    anual: [
      [15, "MSG"], [30, "REL_VIS"], [60, "LIG"], [90, "VIS"], [150, "REL_ATU"], [210, "REL_VIS"],
      [240, "MSG"], [270, "VIS"], [300, "MSG"], [330, "AGE_REN"], [365, "REU_REN"],
    ],
  },
  c: {
    trimestral: [
      [15, "MSG"], [30, "REL_VIS"], [60, "MSG"], [75, "AGE_REN"], [90, "REU_REN"],
    ],
    semestral: [
      [15, "MSG"], [30, "REL_VIS"], [60, "LIG"], [120, "REL_ATU"], [150, "AGE_REN"], [180, "REU_REN"],
    ],
    anual: [
      [15, "MSG"], [30, "REL_VIS"], [60, "LIG"], [90, "REL_ATU"], [120, "MSG"], [210, "VIS"],
      [270, "REL_VIS"], [300, "MSG"], [330, "AGE_REN"], [365, "REU_REN"],
    ],
  },
};
