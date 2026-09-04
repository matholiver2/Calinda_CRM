export type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  tipo: "funil" | "remarketing" | "cliente" | "finalizado";
  promptIa: string | null;
  descricaoObjetivo: string | null;
  handoffHumano: boolean;
  _count?: { leads: number };
};

export type VendedorResumo = {
  id: string;
  nome: string;
  avatarCor: string;
  email?: string;
};

export type GrupoCliente = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  criadoEm?: string;
  _count?: { leads: number };
};

export type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem: string;
  etapaAtualId: string;
  etapaAtual: Etapa;
  vendedorId: string | null;
  vendedor: VendedorResumo | null;
  status: "ativo" | "cliente" | "perdido" | "remarketing" | "finalizado";
  iaAtiva: boolean;
  entrouEm: string;
  atualizadoEm: string;
  respostaIaAgendadaPara: string | null;
  observacoes: string | null;
  grupoId: string | null;
  grupo: { id: string; nome: string; cor: string } | null;
  _count?: { mensagens: number };
};

export type Mensagem = {
  id: string;
  leadId: string;
  remetente: "lead" | "ia" | "vendedor";
  conteudo: string;
  enviadoEm: string;
  statusEntrega: "enviado" | "entregue" | "lido" | "falhou";
  vendedorId: string | null;
  vendedor?: { nome: string; avatarCor: string } | null;
};

export type Reuniao = {
  id: string;
  leadId: string;
  lead?: Lead;
  vendedorId: string | null;
  vendedor: VendedorResumo | null;
  dataHora: string;
  status: "agendada" | "confirmada" | "realizada" | "no_show" | "cancelada";
  resultado: "fechou" | "nao_fechou" | "pendente";
  linkCalendario: string | null;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: "super_admin" | "admin" | "gestor" | "vendedor";
  ativo: boolean;
  avatarCor: string;
  criadoEm?: string;
};

export type AgenteIa = {
  id: string;
  nome: string;
  persona: string;
  objetivo: string;
  etapaId: string;
  etapa: Etapa;
  modeloLlm: string;
  ativo: boolean;
};

export type Plano = {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  periodicidade: "mensal" | "anual" | "unico";
  ativo: boolean;
  criadoEm: string;
};

export type Orcamento = {
  id: string;
  leadId: string;
  lead: { id: string; nome: string; telefone: string; email: string | null };
  planoId: string | null;
  plano: { id: string; nome: string; periodicidade: string } | null;
  valor: number;
  observacoes: string | null;
  status: "rascunho" | "enviado";
  criadoPor: { id: string; nome: string } | null;
  criadoEm: string;
};

export type Venda = {
  id: string;
  leadId: string | null;
  lead: { id: string; nome: string } | null;
  vendedorId: string | null;
  vendedor: VendedorResumo | null;
  valor: number;
  quantidade: number;
  formaPagamento: "pix" | "cartao" | "boleto" | "dinheiro" | "transferencia";
  recorrente: boolean;
  proximaCobrancaEm: string | null;
  comissaoIntegral: boolean;
  comissaoPercentual: number | null;
  dataPagamento: string;
  status: "rascunho" | "confirmada";
  comprovantePath: string | null;
  criadoEm: string;
};

export type MetricaGeral = {
  totalLeads: number;
  leadsAtivos: number;
  leadsCliente: number;
  leadsPerdidos: number;
  leadsRemarketing: number;
  taxaConversaoGeral: number;
  porEtapa: { etapaId: string; nome: string; cor: string; ordem: number; total: number }[];
  leadsParados: { id: string; nome: string; etapa: string; cor: string; dias: number }[];
  diasLimiteParado: number;
  reunioesProximas: { id: string; leadNome: string; dataHora: string; vendedorNome: string; status: string }[];
  leadsRecentes: { id: string; nome: string; origem: string; etapa: string; cor: string; entrouEm: string; vendedor: string | null }[];
};
