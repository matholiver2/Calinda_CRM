"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, Video, MessageCircle, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import type { Lead, VendedorResumo } from "@/types";

export function NovaReuniaoDialog({
  open,
  onClose,
  onSalvo,
}: {
  open: boolean;
  onClose: () => void;
  onSalvo: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Novo evento">
      {open && <NovaReuniaoForm onClose={onClose} onSalvo={onSalvo} />}
    </Dialog>
  );
}

function NovaReuniaoForm({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher);
  const { data: usuariosData } = useSWR<{ usuarios: VendedorResumo[] }>("/api/usuarios", fetcher);
  const { data: meData } = useSWR<{ usuario: { id: string } }>("/api/auth/me", fetcher);
  const { data: configData } = useSWR<{ configuracoes: Record<string, string> }>("/api/configuracoes", fetcher);
  const meetLink = configData?.configuracoes.google_meet_link ?? "";

  const leads = leadsData?.leads ?? [];
  const usuarios = usuariosData?.usuarios ?? [];

  const [leadId, setLeadId] = useState("");
  const [vendedorId, setVendedorId] = useState(meData?.usuario?.id ?? "");
  const [dataHora, setDataHora] = useState("");
  const [modalidade, setModalidade] = useState<"google_meet" | "whatsapp">("whatsapp");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!leadId || !dataHora) {
      setErro("Selecione o cliente e a data/hora");
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
        <div className="grid grid-cols-2 gap-2">
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
            <Video className="h-4 w-4" /> Google Meet
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
            <MessageCircle className="h-4 w-4" /> Ligação WhatsApp
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
              Nenhum link de Meet configurado ainda — defina em Configurações → Agenda.
            </p>
          ))}
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
