"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, Video, MessageCircle, MapPin, ExternalLink, FileClock } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select, Input, Textarea } from "@/components/ui/Input";
import { EmailsChipsInput } from "@/components/ui/EmailsChipsInput";
import { cn } from "@/lib/utils";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import type { Lead, VendedorResumo } from "@/types";

export function NovaReuniaoDialog({
  open,
  onClose,
  onSalvo,
  leadIdInicial,
}: {
  open: boolean;
  onClose: () => void;
  onSalvo: () => void;
  /** Pré-seleciona (e trava) o cliente/lead — usado ao agendar direto da página dele. */
  leadIdInicial?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Novo evento">
      {open && <NovaReuniaoForm onClose={onClose} onSalvo={onSalvo} leadIdInicial={leadIdInicial} />}
    </Dialog>
  );
}

function NovaReuniaoForm({
  onClose,
  onSalvo,
  leadIdInicial,
}: {
  onClose: () => void;
  onSalvo: () => void;
  leadIdInicial?: string;
}) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher);
  const { data: usuariosData } = useSWR<{ usuarios: VendedorResumo[] }>("/api/usuarios", fetcher);
  const { data: meData } = useSWR<{ usuario: { id: string } }>("/api/auth/me", fetcher);
  const { data: configData } = useSWR<{ configuracoes: Record<string, string> }>("/api/configuracoes", fetcher);
  const meetLink = configData?.configuracoes.google_meet_link ?? "";

  const leads = leadsData?.leads ?? [];
  const usuarios = usuariosData?.usuarios ?? [];

  const [leadId, setLeadId] = useState(leadIdInicial ?? "");
  const [vendedorId, setVendedorId] = useState(meData?.usuario?.id ?? "");
  const [dataHora, setDataHora] = useState("");
  const [modalidade, setModalidade] = useState<"google_meet" | "whatsapp" | "presencial">("whatsapp");
  const [endereco, setEndereco] = useState("");
  const [emailsConvidados, setEmailsConvidados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [followUpRenovacao, setFollowUpRenovacao] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregandoSugestao, setCarregandoSugestao] = useState(false);

  async function alternarFollowUpRenovacao(ativo: boolean) {
    setFollowUpRenovacao(ativo);
    if (!ativo || !leadId) return;
    setCarregandoSugestao(true);
    try {
      const { sugestao } = await fetcher<{ sugestao: { titulo: string; descricao: string } | null }>(
        `/api/leads/${leadId}/descricao-reuniao`
      );
      if (sugestao) {
        setTitulo(sugestao.titulo);
        setDescricao(sugestao.descricao);
      }
    } finally {
      setCarregandoSugestao(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!leadId || !dataHora) {
      setErro("Selecione o cliente e a data/hora");
      return;
    }
    if (modalidade === "presencial" && !endereco.trim()) {
      setErro("Informe o endereço do encontro");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/reunioes", {
        leadId,
        vendedorId: vendedorId || undefined,
        dataHora: new Date(dataHora).toISOString(),
        modalidade,
        linkCalendario: modalidade === "google_meet" ? meetLink || null : null,
        endereco: modalidade === "presencial" ? endereco.trim() : undefined,
        emailsConvidados,
        titulo: titulo.trim() || undefined,
        descricao: descricao.trim() || undefined,
      });
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar evento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Lead / Cliente</label>
        <Select
          required
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          disabled={!!leadIdInicial}
        >
          <option value="">Selecionar...</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
              {l.status !== "cliente" ? " (lead)" : ""}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Responsável</label>
        <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
          <option value="">Não atribuído</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Data e hora</label>
        <Input required type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Modalidade</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setModalidade("google_meet")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors",
              modalidade === "google_meet"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted hover:bg-surface-hover"
            )}
          >
            <Video className="h-4 w-4" /> Meet
          </button>
          <button
            type="button"
            onClick={() => setModalidade("whatsapp")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors",
              modalidade === "whatsapp"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted hover:bg-surface-hover"
            )}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setModalidade("presencial")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-colors",
              modalidade === "presencial"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted hover:bg-surface-hover"
            )}
          >
            <MapPin className="h-4 w-4" /> Presencial
          </button>
        </div>
        {modalidade === "google_meet" &&
          (meetLink ? (
            <a
              href={meetLink}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
            >
              <ExternalLink className="h-3 w-3" /> {meetLink}
            </a>
          ) : (
            <p className="mt-2 text-xs text-warning">
              Nenhum link de Meet configurado ainda — gerado automaticamente se o responsável tiver o Google Calendar conectado, ou defina um fixo em Configurações → Agenda.
            </p>
          ))}
        {modalidade === "google_meet" && (
          <div className="mt-2">
            <EmailsChipsInput
              value={emailsConvidados}
              onChange={setEmailsConvidados}
              placeholder="E-mails extras pro convite"
            />
          </div>
        )}
        {modalidade === "presencial" && (
          <Input
            className="mt-2"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Endereço do encontro"
          />
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={followUpRenovacao}
            onChange={(e) => alternarFollowUpRenovacao(e.target.checked)}
            disabled={!leadId}
          />
          <FileClock className="h-3.5 w-3.5 text-fg-muted" />
          Follow-up de renovação (preenche título/descrição com os dados de contrato do cliente)
        </label>
        {carregandoSugestao && <p className="mt-1 text-xs text-fg-subtle">Buscando dados do cliente...</p>}
        {followUpRenovacao && (
          <div className="mt-2 space-y-2">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do evento" />
            <Textarea
              rows={6}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do evento"
              className="font-mono text-xs"
            />
          </div>
        )}
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          <Save className="h-3.5 w-3.5" /> Criar evento
        </Button>
      </div>
    </form>
  );
}
