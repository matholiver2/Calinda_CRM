"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Pencil, Sparkles, Phone, MessageCircle, Repeat2, MessageCirclePlus, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ChatThread } from "@/components/features/ChatThread";
import { cn } from "@/lib/utils";
import { fetcher, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import type { Lead } from "@/types";

type TipoFollowUp = {
  id: string;
  nome: string;
  objetivo: string | null;
  canal: "automatico" | "manual";
  scriptModelo: string;
  modoEnvio: "literal" | "ia";
  ativo: boolean;
};

type ReguaFollowUp = {
  id: string;
  perfil: "a" | "b" | "c";
  periodicidade: "trimestral" | "semestral" | "anual";
  diaOffset: number;
  tipoFollowUpId: string;
  tipoFollowUp: { id: string; nome: string; canal: "automatico" | "manual" };
};

const PERFIS = [
  { id: "a" as const, label: "A — Estratégico" },
  { id: "b" as const, label: "B — Intermediário" },
  { id: "c" as const, label: "C — Operacional" },
];

const PERIODICIDADES = [
  { id: "trimestral" as const, label: "Trimestral" },
  { id: "semestral" as const, label: "Semestral" },
  { id: "anual" as const, label: "Anual" },
];

type AbaId = "tipos" | "regua" | "remarketing";

const TABS: { id: AbaId; label: string }[] = [
  { id: "tipos", label: "Tipos de Follow-up" },
  { id: "regua", label: "Régua de Relacionamento" },
  { id: "remarketing", label: "Remarketing" },
];

export default function FollowUpPage() {
  return (
    <Suspense>
      <FollowUpConteudo />
    </Suspense>
  );
}

function FollowUpConteudo() {
  const searchParams = useSearchParams();
  const abaInicial = TABS.find((t) => t.id === searchParams.get("tab"))?.id ?? "tipos";
  const [aba, setAba] = useState<AbaId>(abaInicial);

  return (
    <div>
      <PageHeader
        title="Follow-up"
        description="Régua de relacionamento, tipos de follow-up e remarketing de leads que não fecharam"
      />

      <div className="mb-6 flex gap-1.5 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              aba === t.id ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-hover"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === "tipos" && <AbaTipos />}
      {aba === "regua" && <AbaRegua />}
      {aba === "remarketing" && <AbaRemarketing />}
    </div>
  );
}

function AbaTipos() {
  const { data } = useSWR<{ tipos: TipoFollowUp[] }>("/api/tipos-follow-up", fetcher);
  const tipos = data?.tipos ?? [];
  const [editando, setEditando] = useState<TipoFollowUp | "novo" | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditando("novo")}>
          <Plus className="h-3.5 w-3.5" /> Novo tipo
        </Button>
      </div>

      {tipos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-fg">Nenhum tipo de follow-up ainda</p>
          <p className="max-w-sm text-sm text-fg-subtle">
            Crie os tipos um a um, ou carregue um modelo pronto na aba &quot;Régua de Relacionamento&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tipos.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{t.nome}</p>
                <Badge color={t.canal === "automatico" ? "#10B981" : "#F59E0B"}>
                  {t.canal === "automatico" ? "Automático" : "Manual"}
                </Badge>
              </div>
              {t.objetivo && <p className="mb-2 text-xs text-fg-subtle">{t.objetivo}</p>}
              <p className="line-clamp-3 whitespace-pre-line text-xs text-fg-muted">{t.scriptModelo}</p>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[10px] text-fg-subtle">{t.ativo ? "Ativo" : "Inativo"}</span>
                <button onClick={() => setEditando(t)} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TipoFollowUpDialog tipo={editando === "novo" ? null : editando} open={editando !== null} onClose={() => setEditando(null)} />
    </div>
  );
}

function TipoFollowUpDialog({ tipo, open, onClose }: { tipo: TipoFollowUp | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={tipo ? "Editar tipo de follow-up" : "Novo tipo de follow-up"} maxWidth="max-w-lg">
      {open && <TipoFollowUpForm tipo={tipo} onClose={onClose} />}
    </Dialog>
  );
}

function TipoFollowUpForm({ tipo, onClose }: { tipo: TipoFollowUp | null; onClose: () => void }) {
  const [nome, setNome] = useState(tipo?.nome ?? "");
  const [objetivo, setObjetivo] = useState(tipo?.objetivo ?? "");
  const [canal, setCanal] = useState<TipoFollowUp["canal"]>(tipo?.canal ?? "automatico");
  const [scriptModelo, setScriptModelo] = useState(tipo?.scriptModelo ?? "");
  const [modoEnvio, setModoEnvio] = useState<TipoFollowUp["modoEnvio"]>(tipo?.modoEnvio ?? "literal");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!nome.trim() || !scriptModelo.trim()) {
      setErro("Nome e script/modelo são obrigatórios");
      return;
    }
    setSalvando(true);
    try {
      const payload = { nome: nome.trim(), objetivo: objetivo.trim() || null, canal, scriptModelo: scriptModelo.trim(), modoEnvio };
      if (tipo) await apiPatch(`/api/tipos-follow-up/${tipo.id}`, payload);
      else await apiPost("/api/tipos-follow-up", payload);
      mutate("/api/tipos-follow-up");
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!tipo || !confirm("Excluir este tipo de follow-up? Os marcos da régua que o usam também somem.")) return;
    setSalvando(true);
    try {
      await apiDelete(`/api/tipos-follow-up/${tipo.id}`);
      mutate("/api/tipos-follow-up");
      mutate("/api/reguas-follow-up");
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao excluir");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Ligação de relacionamento" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Objetivo</label>
        <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Pra que serve esse contato" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Canal</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCanal("automatico")}
            className={cn(
              "rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors",
              canal === "automatico" ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:bg-surface-hover"
            )}
          >
            <MessageCircle className="mr-1.5 inline h-3.5 w-3.5" /> Automático (WhatsApp)
          </button>
          <button
            type="button"
            onClick={() => setCanal("manual")}
            className={cn(
              "rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors",
              canal === "manual" ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:bg-surface-hover"
            )}
          >
            <Phone className="mr-1.5 inline h-3.5 w-3.5" /> Manual (ligação/visita)
          </button>
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">
          {canal === "automatico"
            ? "O Calinda manda essa mensagem sozinho pelo WhatsApp quando o marco da régua vence."
            : "Não dá pra automatizar uma ligação ou visita de verdade — vira um lembrete/notificação pro vendedor, com o roteiro abaixo de apoio."}
        </p>
      </div>
      {canal === "automatico" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Modo de envio</label>
          <Select value={modoEnvio} onChange={(e) => setModoEnvio(e.target.value as TipoFollowUp["modoEnvio"])}>
            <option value="literal">Enviar exatamente como escrito abaixo</option>
            <option value="ia">IA usa como base e adapta</option>
          </Select>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">
          {canal === "automatico" ? "Mensagem" : "Roteiro"} ({"{nome}"} e {"{empresa}"} são substituídos automaticamente)
        </label>
        <Textarea rows={6} value={scriptModelo} onChange={(e) => setScriptModelo(e.target.value)} className="font-mono text-xs" />
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        {tipo ? (
          <Button variant="danger" size="sm" loading={salvando} onClick={excluir}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button size="sm" loading={salvando} onClick={salvar}>
          Salvar
        </Button>
      </div>
    </div>
  );
}

function AbaRegua() {
  const { data: reguasData, mutate: mutateReguas } = useSWR<{ reguas: ReguaFollowUp[] }>("/api/reguas-follow-up", fetcher);
  const { data: tiposData } = useSWR<{ tipos: TipoFollowUp[] }>("/api/tipos-follow-up", fetcher);
  const [perfil, setPerfil] = useState<"a" | "b" | "c">("a");
  const [carregando, setCarregando] = useState(false);

  const reguas = reguasData?.reguas ?? [];
  const tipos = (tiposData?.tipos ?? []).filter((t) => t.ativo);

  async function carregarPadrao() {
    if (!confirm("Isso cria os 8 tipos de follow-up padrão e a régua completa (A/B/C × trimestral/semestral/anual) — tipos com o mesmo nome não são duplicados. Continuar?")) return;
    setCarregando(true);
    try {
      await apiPost("/api/reguas-follow-up/carregar-padrao");
      mutate("/api/tipos-follow-up");
      mutateReguas();
    } catch {
      alert("Erro ao carregar modelo padrão");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {PERFIS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPerfil(p.id)}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                perfil === p.id ? "bg-accent-soft text-accent" : "bg-surface-hover text-fg-muted hover:text-fg"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" loading={carregando} onClick={carregarPadrao}>
          <Sparkles className="h-3.5 w-3.5" /> Carregar modelo padrão
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PERIODICIDADES.map((periodicidade) => (
          <ColunaPeriodicidade
            key={periodicidade.id}
            perfil={perfil}
            periodicidade={periodicidade.id}
            label={periodicidade.label}
            reguas={reguas.filter((r) => r.perfil === perfil && r.periodicidade === periodicidade.id)}
            tipos={tipos}
            onMudou={() => mutateReguas()}
          />
        ))}
      </div>
    </div>
  );
}

function ColunaPeriodicidade({
  perfil,
  periodicidade,
  label,
  reguas,
  tipos,
  onMudou,
}: {
  perfil: "a" | "b" | "c";
  periodicidade: "trimestral" | "semestral" | "anual";
  label: string;
  reguas: ReguaFollowUp[];
  tipos: TipoFollowUp[];
  onMudou: () => void;
}) {
  const [diaOffset, setDiaOffset] = useState("");
  const [tipoFollowUpId, setTipoFollowUpId] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  async function adicionar() {
    const dia = Number(diaOffset);
    if (!Number.isFinite(dia) || dia <= 0 || !tipoFollowUpId) return;
    setAdicionando(true);
    try {
      await apiPost("/api/reguas-follow-up", { perfil, periodicidade, diaOffset: dia, tipoFollowUpId });
      setDiaOffset("");
      setTipoFollowUpId("");
      onMudou();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao adicionar marco");
    } finally {
      setAdicionando(false);
    }
  }

  async function remover(id: string) {
    await apiDelete(`/api/reguas-follow-up/${id}`);
    onMudou();
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-fg">{label}</h3>
      <div className="space-y-1.5">
        {reguas.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg">Dia {r.diaOffset}</p>
              <p className="truncate text-xs text-fg-subtle">{r.tipoFollowUp.nome}</p>
            </div>
            <button onClick={() => remover(r.id)} className="shrink-0 text-fg-subtle hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {reguas.length === 0 && <p className="text-xs text-fg-subtle">Nenhum marco ainda.</p>}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <div className="flex gap-1.5">
          <Input
            type="number"
            min={1}
            placeholder="Dia"
            value={diaOffset}
            onChange={(e) => setDiaOffset(e.target.value)}
            className="w-20"
          />
          <Select value={tipoFollowUpId} onChange={(e) => setTipoFollowUpId(e.target.value)} className="flex-1">
            <option value="">Tipo...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" size="sm" className="w-full" loading={adicionando} onClick={adicionar}>
          <Plus className="h-3.5 w-3.5" /> Adicionar marco
        </Button>
      </div>
    </Card>
  );
}

function AbaRemarketing() {
  const { data } = useSWR<{ leads: Lead[] }>("/api/leads?status=remarketing", fetcher, {
    refreshInterval: 6000,
  });
  const { data: configData } = useSWR<{ configuracoes: Record<string, string> }>("/api/configuracoes", fetcher);
  const intervaloDias = Number(configData?.configuracoes.remarketing_intervalo_dias ?? 3);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null);

  const leads = data?.leads ?? [];
  const leadSelecionado = leads.find((l) => l.id === leadSelecionadoId) ?? null;

  async function reengajar(id: string) {
    setEnviandoId(id);
    try {
      await apiPost(`/api/leads/${id}/reengajar`);
      mutate("/api/leads?status=remarketing");
      mutate("/api/dashboard/metrica-geral");
    } finally {
      setEnviandoId(null);
    }
  }

  function proximoContatoEm(atualizadoEm: string): string {
    const proximo = new Date(new Date(atualizadoEm).getTime() + intervaloDias * 86_400_000);
    return `Próximo contato: ${proximo.toLocaleDateString("pt-BR")}`;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-fg-subtle">
        Leads que não fecharam após a reunião — a IA reengaja automaticamente com base no histórico da conversa.
      </p>

      {leads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
          <Repeat2 className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm font-medium text-fg">Nenhum lead em remarketing no momento</p>
          <p className="text-xs text-fg-subtle">
            Leads entram aqui automaticamente quando uma reunião é marcada como &quot;não fechou&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id} accentColor="#A78BFA" className="p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar nome={lead.nome} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${lead.id}`} className="truncate text-sm font-semibold text-fg hover:underline">
                    {lead.nome}
                  </Link>
                  <p className="text-xs text-fg-subtle">{lead.origem}</p>
                </div>
              </div>
              <div className="mb-3 flex items-center justify-between text-xs">
                <Badge color="#A78BFA">Remarketing</Badge>
                <span className="text-fg-subtle">{proximoContatoEm(lead.atualizadoEm)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setLeadSelecionadoId(lead.id)}>
                  <MessageSquareText className="h-3.5 w-3.5" /> Ver conversa
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  loading={enviandoId === lead.id}
                  onClick={() => reengajar(lead.id)}
                >
                  <MessageCirclePlus className="h-3.5 w-3.5" /> Reengajar agora
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!leadSelecionado}
        onClose={() => setLeadSelecionadoId(null)}
        title={leadSelecionado?.nome ?? ""}
        maxWidth="max-w-lg"
      >
        {leadSelecionado && <ChatThread leadId={leadSelecionado.id} compact />}
      </Dialog>
    </div>
  );
}
