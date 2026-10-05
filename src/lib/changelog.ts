// Changelog do CALINDA — lista mantida no código, editada a cada mudança
// visível pro usuário. Mostrada em /novidades e, pra entradas ainda não
// vistas, num popup automático ao entrar (ver ChangelogPopup.tsx). A data de
// cada entrada é o que decide se ela é "nova" pra quem está logando —
// sempre usar a data real do dia em que a mudança foi publicada.

export type EntradaChangelog = {
  data: string; // ISO (yyyy-mm-dd)
  titulo: string;
  itens: string[];
};

export const CHANGELOG: EntradaChangelog[] = [
  {
    data: "2026-10-05",
    titulo: "Régua de relacionamento e follow-up completo",
    itens: [
      "Novo sistema de régua de relacionamento (tela Follow-up): defina tipos de follow-up (mensagem, relatório, ligação, visita, renovação...) com script/roteiro próprio, e monte uma régua de marcos por dia de contrato — diferente por perfil de cliente (A/B/C) e periodicidade (trimestral/semestral/anual).",
      "Botão \"Carregar modelo padrão\" já cria 8 tipos de follow-up prontos e a régua completa pra editar à vontade.",
      "Clientes agora têm um campo de \"Perfil de follow-up\" (A/B/C) e vendas um campo de \"Periodicidade do contrato\" — é isso que decide qual marco da régua está devido.",
      "Follow-ups automáticos (ex: mensagem de acompanhamento) são enviados sozinhos pelo WhatsApp; os manuais (ligação, visita) viram uma notificação lembrando o vendedor, com o roteiro de apoio.",
      "O Assistente agora conhece os tipos de follow-up configurados e consegue consultar o que está pendente pra um cliente específico quando perguntado.",
    ],
  },
  {
    data: "2026-10-05",
    titulo: "Proposta comercial em PDF, Google Meet automático e melhorias gerais",
    itens: [
      "Orçamentos agora geram um PDF de proposta comercial completo (capa, diagnóstico, método, o que está incluso, prova social, investimento e fechamento), com tema visual e tipografia configuráveis em \"Editar modelo\".",
      "O link do Google Meet das reuniões marcadas pela IA agora é gerado de verdade pelo Google Calendar (não é mais um link fixo reaproveitado), e os e-mails convidados recebem o convite nativo do Google com RSVP.",
      "Nova modalidade de reunião \"Presencial\", com campo de endereço.",
      "Se o WhatsApp automático não conseguir enviar um orçamento, o sistema agora abre o wa.me com a conversa do cliente já pronta pra anexar o PDF manualmente.",
      "Título da aba do navegador passou a mostrar o nome da empresa ativa.",
      "Nova tela de Novidades (essa aqui!), com aviso automático do que mudou toda vez que você entra.",
      "Corrigido: cancelar a criação de um orçamento não deixava mais dados presos pra próxima vez que o modal abria.",
      "Novo botão para excluir um orçamento.",
      "Corrigido: o card \"Faturamento do Mês\" no Dashboard agora atualiza na hora ao registrar uma venda.",
      "Corrigido: a contagem de usuários nos cards de Empresas estava desatualizada — agora reflete quem de fato tem acesso.",
      "A logo escrita do CALINDA substitui o texto nos cabeçalhos e na tela de login.",
      "Botão de Prévia em \"Editar modelo de proposta\" — mostra o PDF com dados de exemplo antes de salvar, pra ver como fica o design.",
      "No Calendário, agora dá pra editar todas as informações de uma reunião (data/hora, responsável, título, descrição, modalidade) e excluir — o evento correspondente no Google Calendar é removido junto.",
      "O chat Assistente tenta de novo automaticamente quando a IA responde com uma instabilidade passageira, antes de mostrar a mensagem de indisponível.",
    ],
  },
  {
    data: "2026-10-02",
    titulo: "Prospecção de leads, follow-up manual e diagnóstico de conexão",
    itens: [
      "Nova tela de Prospecção: busca leads no Google Maps por nicho e localização, e importa os selecionados direto pro funil.",
      "Follow-up manual por conversa: agende um lembrete (em 1h, 3h, amanhã ou uma data escolhida) com histórico e cancelamento.",
      "A IA agora pausa automaticamente quando um vendedor manda uma mensagem manual na conversa, com aviso de quem assumiu.",
      "Diagnóstico de conexão em Configurações — testa banco de dados, IA e WhatsApp com um clique.",
      "Seletor de etapa do funil direto no cabeçalho da conversa.",
      "Campos de contrato no cadastro de vendas, usados para preencher automaticamente a descrição de reuniões de renovação no Calendário.",
    ],
  },
];

/** Entradas mais recentes primeiro que `desde` (exclusive) — null = todas. */
export function entradasNaoVistas(desde: Date | null): EntradaChangelog[] {
  if (!desde) return CHANGELOG;
  return CHANGELOG.filter((e) => new Date(`${e.data}T00:00:00`) > desde);
}
