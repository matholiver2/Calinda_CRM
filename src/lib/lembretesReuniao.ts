import { prisma, comRetryConexao } from "@/lib/db";
import { criarNotificacao } from "@/lib/notificacoes";

/**
 * Roda a cada ~2min (src/instrumentation.ts). Dispara notificação de
 * lembrete quando faltarem <=60min, <=15min e <=0min (início) pra uma
 * reunião agendada/confirmada — cada limiar só dispara uma vez (flag no
 * banco), independente de acertar a janela exata do tick.
 */
export async function pollLembretesReuniao(): Promise<void> {
  const agora = Date.now();
  const duasHorasNoFuturo = new Date(agora + 2 * 60 * 60_000);

  const reunioes = await comRetryConexao(() =>
    prisma.reuniao.findMany({
      where: {
        status: { in: ["agendada", "confirmada"] },
        dataHora: { lte: duasHorasNoFuturo },
      },
      include: { lead: true },
    })
  );

  for (const reuniao of reunioes) {
    try {
      const minutosAte = (reuniao.dataHora.getTime() - agora) / 60_000;
      if (minutosAte < -15) continue; // já passou bastante, não faz sentido mais lembrar

      const horaFormatada = reuniao.dataHora.toLocaleString("pt-BR");

      if (minutosAte <= 0 && !reuniao.lembreteInicioEnviado) {
        await comRetryConexao(() =>
          prisma.reuniao.update({ where: { id: reuniao.id }, data: { lembreteInicioEnviado: true } })
        );
        await criarNotificacao(reuniao.lead.empresaId, {
          tipo: "reuniao_inicio",
          titulo: `Reunião com ${reuniao.lead.nome} começando agora`,
          corpo: `Horário marcado: ${horaFormatada}.`,
          leadId: reuniao.leadId,
          reuniaoId: reuniao.id,
        });
      } else if (minutosAte <= 15 && !reuniao.lembrete15minEnviado) {
        await comRetryConexao(() =>
          prisma.reuniao.update({ where: { id: reuniao.id }, data: { lembrete15minEnviado: true } })
        );
        await criarNotificacao(reuniao.lead.empresaId, {
          tipo: "reuniao_lembrete_15min",
          titulo: `Reunião com ${reuniao.lead.nome} em 15 minutos`,
          corpo: `Horário marcado: ${horaFormatada}.`,
          leadId: reuniao.leadId,
          reuniaoId: reuniao.id,
        });
      } else if (minutosAte <= 60 && !reuniao.lembrete1hEnviado) {
        await comRetryConexao(() =>
          prisma.reuniao.update({ where: { id: reuniao.id }, data: { lembrete1hEnviado: true } })
        );
        await criarNotificacao(reuniao.lead.empresaId, {
          tipo: "reuniao_lembrete_1h",
          titulo: `Reunião com ${reuniao.lead.nome} em 1 hora`,
          corpo: `Horário marcado: ${horaFormatada}.`,
          leadId: reuniao.leadId,
          reuniaoId: reuniao.id,
        });
      }
    } catch (err) {
      console.error("[lembretesReuniao] falha ao processar reunião", reuniao.id, err);
    }
  }
}
