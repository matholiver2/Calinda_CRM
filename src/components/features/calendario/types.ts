export type ReuniaoCalendario = {
  id: string;
  leadId: string;
  lead: { id: string; nome: string; telefone: string } | null;
  vendedorId: string | null;
  vendedor: { id: string; nome: string; avatarCor: string } | null;
  dataHora: string;
  status: "agendada" | "confirmada" | "realizada" | "no_show" | "cancelada";
  resultado: "fechou" | "nao_fechou" | "pendente";
  linkCalendario: string | null;
  modalidade: "google_meet" | "whatsapp";
};

export const STATUS_LABEL: Record<ReuniaoCalendario["status"], string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  no_show: "Não compareceu",
  cancelada: "Cancelada",
};

export const STATUS_COR: Record<ReuniaoCalendario["status"], string> = {
  agendada: "#3B82F6",
  confirmada: "#10B981",
  realizada: "#6B7280",
  no_show: "#EF4444",
  cancelada: "#A3A3A3",
};
