import { prisma } from "@/lib/db";
import { decimalParaNumero } from "@/lib/utils";
import type { DadosPropostaPdf, DeliverableProposta } from "@/lib/pdf/propostaPdf";

const CHAVE_MODELO = "proposta_modelo_json";

export type ModeloProposta = {
  diagnostico: string;
  deliverables: DeliverableProposta[];
  garantia: string;
  urgencia: string;
  fechamento: string;
  corDestaque: string;
  validadeDias: number;
};

export const MODELO_PROPOSTA_PADRAO: ModeloProposta = {
  diagnostico: "",
  deliverables: [],
  garantia: "",
  urgencia: "",
  fechamento: "Essa proposta foi desenhada sob medida para você. O próximo passo é um só: confirmar de acordo abaixo.",
  corDestaque: "#217940",
  validadeDias: 7,
};

export async function carregarModeloProposta(empresaId: string): Promise<ModeloProposta> {
  const config = await prisma.configuracao.findUnique({
    where: { empresaId_chave: { empresaId, chave: CHAVE_MODELO } },
  });
  if (!config?.valor) return MODELO_PROPOSTA_PADRAO;
  try {
    return { ...MODELO_PROPOSTA_PADRAO, ...JSON.parse(config.valor) };
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

const PERIODICIDADE_LABEL: Record<string, string> = {
  mensal: "/mês",
  anual: "/ano",
  unico: " (pagamento único)",
};

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

  const modelo = await carregarModeloProposta(empresaId);

  return {
    empresaNome: orcamento.empresa.nome,
    empresaLogoUrl: orcamento.empresa.logoUrl,
    corDestaque: modelo.corDestaque,
    criadoEm: orcamento.criadoEm,
    lead: orcamento.lead,
    consultorNome: orcamento.criadoPor?.nome ?? null,
    validadeDias: modelo.validadeDias,
    valor: decimalParaNumero(orcamento.valor),
    periodicidadeLabel: orcamento.plano ? PERIODICIDADE_LABEL[orcamento.plano.periodicidade] ?? "" : "",
    planoNome: orcamento.plano?.nome ?? null,
    diagnostico: modelo.diagnostico || orcamento.observacoes || null,
    deliverables: modelo.deliverables,
    garantia: modelo.garantia || null,
    urgencia: modelo.urgencia || null,
    fechamento: modelo.fechamento || null,
  };
}
