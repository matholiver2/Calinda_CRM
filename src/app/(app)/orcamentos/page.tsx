"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Plus, Download, MessageCircle, Mail, FileText, Save, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Textarea, Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost, apiDelete, ApiError } from "@/lib/fetcher";
import { normalizarTelefone } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Orcamento, Plano, Lead } from "@/types";
import { ModeloPropostaDialog } from "@/components/features/orcamentos/ModeloPropostaDialog";

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function OrcamentosPage() {
  return (
    <Suspense>
      <OrcamentosConteudo />
    </Suspense>
  );
}

function OrcamentosConteudo() {
  const searchParams = useSearchParams();
  const leadIdInicial = searchParams.get("leadId") ?? "";

  const { data } = useSWR<{ orcamentos: Orcamento[] }>("/api/orcamentos", fetcher, { refreshInterval: 15000 });
  const [criando, setCriando] = useState(!!leadIdInicial);
  const [editandoModelo, setEditandoModelo] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const orcamentos = data?.orcamentos ?? [];

  async function excluir(id: string) {
    if (!confirm("Excluir este orçamento? Essa ação não pode ser desfeita.")) return;
    try {
      await apiDelete(`/api/orcamentos/${id}`);
      mutate("/api/orcamentos");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir orçamento");
    }
  }

  async function enviar(orcamento: Orcamento, canal: "whatsapp" | "email") {
    setEnviandoId(`${orcamento.id}-${canal}`);
    try {
      await apiPost(`/api/orcamentos/${orcamento.id}/enviar-${canal === "whatsapp" ? "whatsapp" : "email"}`);
      mutate("/api/orcamentos");
      alert(canal === "whatsapp" ? "Orçamento enviado pelo WhatsApp!" : "Orçamento enviado por e-mail!");
    } catch (err) {
      // 409 = sem WhatsApp (não-oficial) conectado; 502 = estava "conectado"
      // mas o envio de fato falhou (worker fora do ar etc.) — nos dois casos
      // cai pro link wa.me: baixa o PDF numa aba e abre o WhatsApp Web/app
      // com a conversa já aberta, pro vendedor anexar manualmente em segundos.
      if (canal === "whatsapp" && err instanceof ApiError && (err.status === 409 || err.status === 502)) {
        abrirWhatsappManual(orcamento);
        return;
      }
      alert(err instanceof ApiError ? err.message : "Erro ao enviar orçamento");
    } finally {
      setEnviandoId(null);
    }
  }

  function abrirWhatsappManual(orcamento: Orcamento) {
    const numero = normalizarTelefone(orcamento.lead.telefone);
    if (!numero) {
      alert("Esse cliente não tem um telefone válido cadastrado.");
      return;
    }
    const mensagem = `Olá, ${orcamento.lead.nome.split(" ")[0]}! Segue a proposta comercial em anexo.`;
    window.open(`/api/orcamentos/${orcamento.id}/pdf`, "_blank");
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description={`${orcamentos.length} orçamento${orcamentos.length === 1 ? "" : "s"} gerado${orcamentos.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditandoModelo(true)}>
              <Pencil className="h-4 w-4" /> Editar modelo
            </Button>
            <Button onClick={() => setCriando(true)}>
              <Plus className="h-4 w-4" /> Novo orçamento
            </Button>
          </>
        }
      />

      {orcamentos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-fg">Nenhum orçamento ainda</p>
          <p className="max-w-sm text-sm text-fg-subtle">
            Crie um orçamento pra um cliente, baixe o PDF ou envie direto por WhatsApp/e-mail.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile: cards empilhados, sem scroll horizontal */}
          <div className="space-y-2.5 sm:hidden">
            {orcamentos.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{o.lead.nome}</p>
                    <p className="text-xs text-fg-subtle">{o.plano?.nome ?? "Valor avulso"}</p>
                  </div>
                  <Badge color={o.status === "enviado" ? "#10B981" : "#71717a"}>
                    {o.status === "enviado" ? "Enviado" : "Rascunho"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-medium text-fg">{formatarMoeda(o.valor)}</p>
                  <p className="text-xs text-fg-subtle">{format(new Date(o.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
                  <a
                    href={`/api/orcamentos/${o.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    title="Baixar PDF"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg-muted"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => enviar(o, "whatsapp")}
                    disabled={enviandoId === `${o.id}-whatsapp`}
                    title="Enviar pelo WhatsApp"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => enviar(o, "email")}
                    disabled={enviandoId === `${o.id}-email` || !o.lead.email}
                    title={o.lead.email ? "Enviar por e-mail" : "Lead sem e-mail cadastrado"}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => excluir(o.id)}
                    title="Excluir orçamento"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop/tablet: tabela */}
          <Card className="hidden overflow-hidden p-7 sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="pb-4 pr-4 font-medium">Cliente</th>
                  <th className="pb-4 pr-4 font-medium">Plano</th>
                  <th className="pb-4 pr-4 font-medium">Valor</th>
                  <th className="pb-4 pr-4 font-medium">Status</th>
                  <th className="pb-4 pr-4 font-medium">Data</th>
                  <th className="pb-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-4 pr-4 font-medium text-fg">{o.lead.nome}</td>
                    <td className="pr-4 text-fg-muted">{o.plano?.nome ?? <span className="text-fg-subtle">—</span>}</td>
                    <td className="pr-4 font-medium text-fg">{formatarMoeda(o.valor)}</td>
                    <td className="pr-4">
                      <Badge color={o.status === "enviado" ? "#10B981" : "#71717a"}>
                        {o.status === "enviado" ? "Enviado" : "Rascunho"}
                      </Badge>
                    </td>
                    <td className="pr-4 text-fg-muted">{format(new Date(o.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/orcamentos/${o.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Baixar PDF"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg-muted"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => enviar(o, "whatsapp")}
                          disabled={enviandoId === `${o.id}-whatsapp`}
                          title="Enviar pelo WhatsApp"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => enviar(o, "email")}
                          disabled={enviandoId === `${o.id}-email` || !o.lead.email}
                          title={o.lead.email ? "Enviar por e-mail" : "Lead sem e-mail cadastrado"}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => excluir(o.id)}
                          title="Excluir orçamento"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}

      <NovoOrcamentoDialog open={criando} leadIdInicial={leadIdInicial} onClose={() => setCriando(false)} />
      <ModeloPropostaDialog open={editandoModelo} onClose={() => setEditandoModelo(false)} />
    </div>
  );
}

function NovoOrcamentoDialog({
  open,
  leadIdInicial,
  onClose,
}: {
  open: boolean;
  leadIdInicial: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Novo orçamento">
      {open && <NovoOrcamentoForm leadIdInicial={leadIdInicial} onClose={onClose} />}
    </Dialog>
  );
}

// Componente separado, só montado enquanto o modal está aberto — fechar
// (inclusive por "Cancelar") desmonta e descarta todo o estado do
// formulário. Antes o form vivia sempre montado (só escondido via `if
// (!open) return null` DEPOIS dos hooks), então cliente/plano/valor
// selecionados ficavam presos no state entre uma abertura e outra: ao
// cancelar e abrir "Novo orçamento" de novo, os campos antigos reapareciam
// pré-preenchidos, dando a impressão de que o cancelar tinha "entrado algo
// na lista" quando na really era um orçamento novo sendo salvo sem querer
// com dados da tentativa anterior.
function NovoOrcamentoForm({ leadIdInicial, onClose }: { leadIdInicial: string; onClose: () => void }) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher);
  const { data: planosData } = useSWR<{ planos: Plano[] }>("/api/planos", fetcher);

  const [leadId, setLeadId] = useState(leadIdInicial);
  const [planoId, setPlanoId] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const leads = leadsData?.leads ?? [];
  const planos = (planosData?.planos ?? []).filter((p) => p.ativo);

  function selecionarPlano(id: string) {
    setPlanoId(id);
    const plano = planos.find((p) => p.id === id);
    if (plano) setValor(plano.valor);
  }

  return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setSalvando(true);
          try {
            await apiPost("/api/orcamentos", { leadId, planoId: planoId || null, valor, observacoes });
            mutate("/api/orcamentos");
            onClose();
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao criar orçamento");
          } finally {
            setSalvando(false);
          }
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cliente</label>
          <Select required value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Selecionar...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Plano (opcional)</label>
          <Select value={planoId} onChange={(e) => selecionarPlano(e.target.value)}>
            <option value="">Sem plano — valor avulso</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {formatarMoeda(p.valor)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Valor (R$)</label>
          <Input required type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Observações</label>
          <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvando}>
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </form>
  );
}
