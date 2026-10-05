// Tipos e constantes do modelo de Proposta Comercial — isolados num arquivo
// sem import de Prisma/servidor pra poder ser usado tanto pelo gerador de
// PDF (server) quanto pelo editor do modelo (client component). Importar
// propostaComercial.ts (que puxa @/lib/db) de um "use client" quebraria o
// bundle do navegador.

export type TemaProposta = "dark-gold" | "dark-indigo" | "light-editorial" | "minimal-mono";
export type EstiloFonte = "moderno" | "classico" | "mono";
export type SectionId = "diagnostico" | "metodo" | "valuestack" | "prova" | "investimento" | "fechamento";
export type SecaoConfig = { id: SectionId; enabled: boolean };

export type DeliverableProposta = { id: string; titulo: string; desc: string; valor: number; bonus?: boolean };
export type EtapaMetodo = { id: string; title: string };
export type Depoimento = { id: string; nome: string; empresa: string; resultado: string; texto: string };

export type ModeloProposta = {
  tema: TemaProposta;
  fonte: EstiloFonte;
  corDestaque: string;
  validadeDias: number;

  capaEyebrow: string;
  capaHeadline: string;
  capaSubtitle: string;

  secoes: SecaoConfig[];

  diagnostico: string;
  custoMensal: number;

  metodoNome: string;
  metodoIntro: string;
  metodoEtapas: EtapaMetodo[];
  metodoMarcos: EtapaMetodo[];

  deliverables: DeliverableProposta[];

  provaBio: string;
  provaCredenciais: string;
  provaMetricas: string;
  depoimentos: Depoimento[];

  garantia: string;
  urgencia: string;

  fechamento: string;
  ctaTexto: string;
};

export const SECOES_LABEL: Record<SectionId, string> = {
  diagnostico: "Diagnóstico",
  metodo: "Método",
  valuestack: "O que está incluso",
  prova: "Prova social",
  investimento: "Investimento",
  fechamento: "Fechamento",
};

export const MODELO_PROPOSTA_PADRAO: ModeloProposta = {
  tema: "dark-gold",
  fonte: "moderno",
  corDestaque: "#D9A94A",
  validadeDias: 7,

  capaEyebrow: "Proposta comercial",
  capaHeadline: "O caminho para {empresa} evoluir, sem complicação.",
  capaSubtitle: "Preparada especialmente para {nome}.",

  secoes: [
    { id: "diagnostico", enabled: true },
    { id: "metodo", enabled: true },
    { id: "valuestack", enabled: true },
    { id: "prova", enabled: false },
    { id: "investimento", enabled: true },
    { id: "fechamento", enabled: true },
  ],

  diagnostico: "",
  custoMensal: 0,

  metodoNome: "",
  metodoIntro: "",
  metodoEtapas: [],
  metodoMarcos: [],

  deliverables: [],

  provaBio: "",
  provaCredenciais: "",
  provaMetricas: "",
  depoimentos: [],

  garantia: "",
  urgencia: "",

  fechamento: "Essa proposta foi desenhada sob medida para você. O próximo passo é um só: confirmar de acordo abaixo.",
  ctaTexto: "Aceitar proposta",
};
