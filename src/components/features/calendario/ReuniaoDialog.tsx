"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Save, Video, MessageCircle, ExternalLink, ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { STATUS_LABEL, type ReuniaoCalendario } from "./types";

export function ReuniaoDialog({
  reuniao,
  onClose,
  onSalvo,
}: {
  reuniao: ReuniaoCalendario | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  return (
    <Dialog open={!!reuniao} onClose={onClose} title="Reunião">
      {reuniao && (
        <ReuniaoForm key={reuniao.id} reuniao={reuniao} onClose={onClose} onSalvo={onSalvo} />
      )}
    </Dialog>
  );
}

function ReuniaoForm({
  reuniao,
  onClose,
  onSalvo,
}: {
  reuniao: ReuniaoCalendario;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { data } = useSWR<{ configuracoes: Record<string, string> }>("/api/configuracoes", fetcher);
  const meetLink = data?.configuracoes.google_meet_link ?? "";

  const [status, setStatus] = useState<ReuniaoCalendario["status"]>(reuniao.status);
  const [modalidade, setModalidade] = useState<ReuniaoCalendario["modalidade"]>(reuniao.modalidade);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    setLoading(true);
    try {
      await apiPatch(`/api/reunioes/${reuniao.id}`, {
        status,
        modalidade,
        linkCalendario: modalidade === "google_meet" ? meetLink || null : null,
      });
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar reunião");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-semibold text-fg">{reuniao.lead?.nome ?? "Lead removido"}</p>
        <p className="text-sm text-fg-subtle">
          {new Date(reuniao.dataHora).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
        </p>
        {reuniao.lead && (
          <Link
            href={`/leads/${reuniao.lead.id}`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
          >
            Ver lead <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Status</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ReuniaoCalendario["status"])}>
          {Object.entries(STATUS_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
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
        {modalidade === "whatsapp" && (
          <p className="mt-2 text-xs text-fg-subtle">A reunião será feita por ligação no número do lead.</p>
        )}
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex justify-end">
        <Button size="sm" loading={loading} onClick={salvar}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>
    </div>
  );
}
