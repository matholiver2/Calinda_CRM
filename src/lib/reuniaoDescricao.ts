import { prisma } from "@/lib/db";
import { decimalParaNumero } from "@/lib/utils";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Monta automaticamente título + descrição de um evento de reunião de
 * follow-up/renovação, no mesmo formato que o usuário já preenchia à mão
 * (template "MODELO DE AGENDA - FOLLOW-UP"): dados do cliente + dados de
 * contrato (puxados da venda mais recente do lead, se houver) + observações
 * do orçamento mais recente como "produtos". Usado por NovaReuniaoDialog
 * quando o vendedor marca "Follow-up de renovação" pra um lead que já é
 * cliente — poupa o trabalho manual de montar essa descrição toda vez.
 */
export async function montarDescricaoFollowUp(leadId: string): Promise<{ titulo: string; descricao: string } | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const [venda, orcamento] = await Promise.all([
    prisma.venda.findFirst({ where: { leadId }, orderBy: { criadoEm: "desc" } }),
    prisma.orcamento.findFirst({ where: { leadId }, orderBy: { criadoEm: "desc" }, include: { plano: true } }),
  ]);

  const linhas: string[] = ["CLIENTE", `Empresa: ${lead.nome}`];
  if (lead.instagramSite) linhas.push(`Instagram/Site: ${lead.instagramSite}`);

  if (venda) {
    linhas.push("", "CONTRATO");
    if (venda.contratoInicioEm) linhas.push(`Início do contrato: ${fmtData(venda.contratoInicioEm)}`);
    if (venda.contratoFimEm) linhas.push(`Término do contrato: ${fmtData(venda.contratoFimEm)}`);
    if (venda.statusContratoTexto) linhas.push(`Status: ${venda.statusContratoTexto}`);
    if (orcamento?.plano?.nome) linhas.push(`Plano contratado: ${orcamento.plano.nome}`);
    linhas.push(`Valor: ${fmtBRL(decimalParaNumero(venda.valor))}`);
    linhas.push(`Último pagamento: ${fmtData(venda.dataPagamento)}`);
  }

  if (orcamento?.observacoes) {
    linhas.push("", "PRODUTOS/OBSERVAÇÕES", orcamento.observacoes);
  }

  linhas.push("", "Agendada via Calinda.");

  return {
    titulo: `${lead.nome}: Renovação/Follow-up`,
    descricao: linhas.join("\n"),
  };
}
