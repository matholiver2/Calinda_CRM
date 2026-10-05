import { prisma } from "@/lib/db";
import { decimalParaNumero } from "@/lib/utils";
import type { DadosPropostaPdf } from "@/lib/pdf/propostaPdf";
import { MODELO_PROPOSTA_PADRAO, type ModeloProposta } from "@/lib/propostaTipos";

export * from "@/lib/propostaTipos";

const CHAVE_MODELO = "proposta_modelo_json";

export async function carregarModeloProposta(empresaId: string): Promise<ModeloProposta> {
  const config = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId, chave: CHAVE_MODELO } },
  });
  if (!config?.valor) return MODELO_PROPOSTA_PADRAO;
  try {
    const salvo = JSON.parse(config.valor);
    return { ...MODELO_PROPOSTA_PADRAO, ...salvo };
  } catch {
    return MODELO_PROPOSTA_PADRAO;
  }
}

export async function salvarModeloProposta(empresaId: string, modelo: ModeloProposta): Promise<void> {
  await prisma.configuracao.upsert({
    where: { empresaId_chave: { empresaId, chave: CHAVE_MODELO } },
    create: { empresaId, chave: CHAVE_MODELO, valor: JSON.stringify(modelo) },
    update: { valor: JSON.stringify(modelo) },
  });
}

/** Substitui {nome} e {empresa} no texto configurado — mesmo padrão de placeholder usado nas mensagens automáticas (ver mensagemConfiguravel.ts). */
function interpolar(texto: string, leadNome: string, empresaNome: string): string {
  return texto.replaceAll("{nome}", leadNome.split(" ")[0]).replaceAll("{empresa}", empresaNome);
}

const PERIODICIDADE_LABEL: Record<string, string> = {
  mensal: "/mês",
  anual: "/ano",
  unico: " (pagamento único)",
};

type InfoOrcamento = {
  empresaNome: string;
  empresaLogoUrl: string | null;
  lead: { nome: string; telefone: string; email: string | null };
  consultorNome: string | null;
  valor: number;
  periodicidadeLabel: string;
  planoNome: string | null;
  criadoEm: Date;
  /** Observações do orçamento — usadas como diagnóstico de fallback só quando o modelo não configura um texto próprio. */
  observacoes?: string | null;
};

function montarDadosProposta(m: ModeloProposta, info: InfoOrcamento): DadosPropostaPdf {
  const interp = (t: string) => interpolar(t, info.lead.nome, info.empresaNome);

  return {
    empresaNome: info.empresaNome,
    empresaLogoUrl: info.empresaLogoUrl,
    tema: m.tema,
    fonte: m.fonte,
    corDestaque: m.corDestaque,
    criadoEm: info.criadoEm,
    lead: info.lead,
    consultorNome: info.consultorNome,
    validadeDias: m.validadeDias,
    valor: info.valor,
    periodicidadeLabel: info.periodicidadeLabel,
    planoNome: info.planoNome,

    capaEyebrow: interp(m.capaEyebrow),
    capaHeadline: interp(m.capaHeadline),
    capaSubtitle: interp(m.capaSubtitle),

    secoes: m.secoes,

    diagnostico: m.diagnostico ? interp(m.diagnostico) : info.observacoes || null,
    custoMensal: m.custoMensal,

    metodoNome: m.metodoNome || null,
    metodoIntro: m.metodoIntro || null,
    metodoEtapas: m.metodoEtapas,
    metodoMarcos: m.metodoMarcos,

    deliverables: m.deliverables,

    provaBio: m.provaBio || null,
    provaCredenciais: m.provaCredenciais || null,
    provaMetricas: m.provaMetricas || null,
    depoimentos: m.depoimentos,

    garantia: m.garantia || null,
    urgencia: m.urgencia || null,

    fechamento: m.fechamento ? interp(m.fechamento) : null,
    ctaTexto: m.ctaTexto || null,
  };
}

export async function carregarPropostaParaPdf(orcamentoId: string, empresaId: string): Promise<DadosPropostaPdf | null> {
  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    include: {
      empresa: { select: { nome: true, logoUrl: true } },
      lead: { select: { nome: true, telefone: true, email: true } },
      plano: { select: { nome: true, periodicidade: true } },
      criadoPor: { select: { nome: true } },
    },
  });
  if (!orcamento || orcamento.empresaId !== empresaId) return null;

  const m = await carregarModeloProposta(empresaId);
  return montarDadosProposta(m, {
    empresaNome: orcamento.empresa.nome,
    empresaLogoUrl: orcamento.empresa.logoUrl,
    lead: orcamento.lead,
    consultorNome: orcamento.criadoPor?.nome ?? null,
    valor: decimalParaNumero(orcamento.valor),
    periodicidadeLabel: orcamento.plano ? PERIODICIDADE_LABEL[orcamento.plano.periodicidade] ?? "" : "",
    planoNome: orcamento.plano?.nome ?? null,
    criadoEm: orcamento.criadoEm,
    observacoes: orcamento.observacoes,
  });
}

/**
 * Monta uma proposta de exemplo (dados fictícios de cliente/valor, mas com a
 * marca/logo real da empresa) pra pré-visualizar o modelo sendo editado
 * antes de salvar — ver botão "Prévia" em ModeloPropostaDialog. Não lê nada
 * do banco além da empresa, já que o `modelo` vem direto do formulário
 * (ainda não salvo).
 */
export async function construirPropostaExemplo(empresaId: string, modelo: ModeloProposta): Promise<DadosPropostaPdf | null> {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nome: true, logoUrl: true } });
  if (!empresa) return null;

  return montarDadosProposta(modelo, {
    empresaNome: empresa.nome,
    empresaLogoUrl: empresa.logoUrl,
    lead: { nome: "Cliente Exemplo", telefone: "5519999999999", email: "cliente@exemplo.com" },
    consultorNome: null,
    valor: 1997,
    periodicidadeLabel: "/mês",
    planoNome: "Plano Exemplo",
    criadoEm: new Date(),
    observacoes: "Esse texto de exemplo mostra como fica o diagnóstico quando o campo está vazio no modelo.",
  });
}
