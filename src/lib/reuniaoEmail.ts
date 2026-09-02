import { prisma } from "@/lib/db";
import { enviarEmailSimples } from "@/lib/gmail";
import { gerarMensagemComBase } from "@/lib/ai/engine";

const ASSUNTO_PADRAO = "Reunião com {empresa} — {data}";
const CORPO_PADRAO =
  "Olá, {nome}!\n\nSua reunião com a {empresa} está confirmada para {data}.\n\nLink do Google Meet: {link}\n\nAté lá!";

function preencherVariaveis(
  texto: string,
  vars: { nome: string; empresa: string; data: string; link: string }
): string {
  return texto
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{empresa}", vars.empresa)
    .replaceAll("{data}", vars.data)
    .replaceAll("{link}", vars.link);
}

/**
 * Convite por e-mail pro cliente quando a reunião é Google Meet — mesma
 * ideia do Google Calendar mandando o link automaticamente. Assunto e
 * corpo são configuráveis em Configurar IA (chaves
 * convite_reuniao_email_assunto/convite_reuniao_email_corpo, variáveis
 * {nome}/{empresa}/{data}/{link}); sem configuração, usa o texto padrão.
 * Silencioso se faltar qualquer pré-requisito (lead sem e-mail, sem
 * vendedor atribuído, vendedor sem Google conectado) — a reunião continua
 * válida mesmo sem esse e-mail sair, é só um "a mais".
 */
export async function enviarConviteReuniaoPorEmail(reuniaoId: string): Promise<void> {
  try {
    const reuniao = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: { lead: { include: { empresa: true } }, vendedor: true },
    });
    if (!reuniao || reuniao.modalidade !== "google_meet" || !reuniao.linkCalendario) return;
    if (!reuniao.lead.email || !reuniao.vendedor) return;

    const dataFormatada = reuniao.dataHora.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const configs = await prisma.configuracao.findMany({
      where: {
        empresaId: reuniao.lead.empresaId,
        chave: { in: ["convite_reuniao_email_assunto", "convite_reuniao_email_corpo", "convite_reuniao_email_modo"] },
      },
    });
    const assuntoTemplate = configs.find((c) => c.chave === "convite_reuniao_email_assunto")?.valor || ASSUNTO_PADRAO;
    const corpoTemplate = configs.find((c) => c.chave === "convite_reuniao_email_corpo")?.valor || CORPO_PADRAO;
    const modo = configs.find((c) => c.chave === "convite_reuniao_email_modo")?.valor ?? "literal";

    const vars = {
      nome: reuniao.lead.nome.split(" ")[0],
      empresa: reuniao.lead.empresa.nome,
      data: dataFormatada,
      link: reuniao.linkCalendario,
    };

    // Assunto é sempre literal (linha curta e factual) — só o corpo pode
    // usar o texto configurado como base pra IA adaptar.
    const corpoSubstituido = preencherVariaveis(corpoTemplate, vars);
    const corpo =
      modo === "ia"
        ? await gerarMensagemComBase({
            baseTexto: corpoSubstituido,
            tarefa: "um e-mail de confirmação de reunião, com o link do Google Meet",
            leadNome: vars.nome,
            persona: `Você representa a ${vars.empresa}.`,
            formato: "email",
          })
        : corpoSubstituido;

    const resultado = await enviarEmailSimples(reuniao.vendedor, {
      para: reuniao.lead.email,
      assunto: preencherVariaveis(assuntoTemplate, vars),
      corpo,
    });

    if (!resultado.ok) {
      console.error(`[reuniaoEmail] falha ao enviar convite pro lead ${reuniao.leadId}:`, resultado.erro);
    }
  } catch (err) {
    console.error(`[reuniaoEmail] erro ao processar convite da reunião ${reuniaoId}:`, err);
  }
}
