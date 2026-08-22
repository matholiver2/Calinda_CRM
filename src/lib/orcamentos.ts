import { prisma } from "@/lib/db";
import { decimalParaNumero } from "@/lib/utils";
import { parseLinhasModelo, textoLegadoParaLinhas } from "@/lib/orcamentoModelo";
import type { DadosOrcamentoPdf } from "@/lib/pdf/orcamentoPdf";

export async function carregarOrcamentoParaPdf(
  orcamentoId: string,
  empresaId: string
): Promise<DadosOrcamentoPdf | null> {
  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    include: {
      empresa: { select: { nome: true, logoUrl: true } },
      lead: { select: { nome: true, telefone: true, email: true } },
      plano: { select: { nome: true, periodicidade: true } },
    },
  });
  if (!orcamento || orcamento.empresaId !== empresaId) return null;

  const configuracoes = await prisma.configuracao.findMany({
    where: {
      empresaId,
      chave: { in: ["orcamento_modelo_blocos", "orcamento_texto_padrao"] },
    },
  });
  const blocosRaw = configuracoes.find((c) => c.chave === "orcamento_modelo_blocos")?.valor;
  const textoLegado = configuracoes.find((c) => c.chave === "orcamento_texto_padrao")?.valor;

  const linhasModelo = blocosRaw ? parseLinhasModelo(blocosRaw) : textoLegado ? textoLegadoParaLinhas(textoLegado) : [];

  return {
    empresaNome: orcamento.empresa.nome,
    empresaLogoUrl: orcamento.empresa.logoUrl,
    criadoEm: orcamento.criadoEm,
    lead: orcamento.lead,
    plano: orcamento.plano,
    valor: decimalParaNumero(orcamento.valor),
    observacoes: orcamento.observacoes,
    linhasModelo,
  };
}
