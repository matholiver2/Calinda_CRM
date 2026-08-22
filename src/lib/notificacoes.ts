import { prisma, comRetryConexao } from "@/lib/db";

export async function criarNotificacao(
  empresaId: string,
  dados: { tipo: string; titulo: string; corpo: string; leadId?: string; reuniaoId?: string }
) {
  await comRetryConexao(() =>
    prisma.notificacao.create({
      data: {
        empresaId,
        tipo: dados.tipo,
        titulo: dados.titulo,
        corpo: dados.corpo,
        leadId: dados.leadId,
        reuniaoId: dados.reuniaoId,
      },
    })
  );
}
