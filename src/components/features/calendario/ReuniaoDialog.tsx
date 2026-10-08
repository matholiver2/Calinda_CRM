"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Save, Video, MessageCircle, MapPin, ExternalLink, ArrowRight, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select, Input, Textarea } from "@/components/ui/Input";
import { EmailsChipsInput } from "@/components/ui/EmailsChipsInput";
import { cn } from "@/lib/utils";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import { STATUS_LABEL, type ReuniaoCalendario } from "./types";
import type { VendedorResumo } from "@/types";

function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const { data: usuariosData } = useSWR<{ usuarios: VendedorResumo[] }>("/api/usuarios", fetcher);
  const meetLink = data?.configuracoes.google_meet_link ?? "";
  const usuarios = usuariosData?.usuarios ?? [];

  const [dataHora, setDataHora] = useState(paraDatetimeLocal(reuniao.dataHora));
  const [vendedorId, setVendedorId] = useState(reuniao.vendedorId ?? "");
  const [status, setStatus] = useState<ReuniaoCalendario["status"]>(reuniao.status);
  const [modalidade, setModalidade] = useState<ReuniaoCalendario["modalidade"]>(reuniao.modalidade);
  const [endereco, setEndereco] = useState(reuniao.endereco ?? "");
  const [titulo, setTitulo] = useState(reuniao.titulo ?? "");
  const [descricao, setDescricao] = useState(reuniao.descricao ?? "");
  const [emailsConvidados, setEmailsConvidados] = useState<string[]>(reuniao.emailsConvidados);
  const [loading, setLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (modalidade === "presencial" && !endereco.trim()) {
      setErro("Informe o endereço do encontro");
      return;
    }
    setLoading(true);
    try {
      await apiPatch(`/api/reunioes/${reuniao.id}`, {
        dataHora: new Date(dataHora).toISOString(),
        vendedorId: vendedorId || null,
        status,
        modalidade,
        // Deixa o campo de fora quando vira/continua Google Meet — a
        // sincronização com o Google (sincronizarReuniaoComGoogle) é quem
        // decide o link de verdade; mandar aqui sobrescreveria um link já
        // gerado com o fixo configurado (ou com null, se não houver um).
        ...(modalidade !== "google_meet" ? { linkCalendario: null } : {}),
        endereco: modalidade === "presencial" ? endereco.trim() : null,
        titulo: titulo.trim() || null,
        descricao: descricao.trim() || null,
        emailsConvidados,
      });
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar reunião");
    } finally {
      setLoading(false);
    }
  }

  async function excluir() {
    if (!confirm("Excluir esta reunião? O evento também é removido do Google Calendar, se houver.")) return;
    setExcluindo(true);
    setErro(null);
    try {
      await apiDelete(`/api/reunioes/${reuniao.id}`);
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao excluir reunião");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-semibold text-fg">{reuniao.lead?.nome ?? "Lead removido"}</p>
        {reuniao.lead && (
          <Link
            href={`/leads/${reuniao.lead.id}`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
          >
            Ver lead <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Data e hora</label>
          <Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Responsável</label>
          <Select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            <option value="">Não atribuído</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.usuarioId ?? u.id}>
                {u.nome}
              </option>
            ))}
          </Select>
        </div>
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
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Título do evento</label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={`Calinda — ${reuniao.lead?.nome ?? ""}`} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Descrição</label>
        <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
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
        {modalidade === "google_meet" && (
          <>
            {reuniao.linkCalendario ? (
              <a
                href={reuniao.linkCalendario}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
              >
                <ExternalLink className="h-3 w-3" /> {reuniao.linkCalendario}
              </a>
            ) : meetLink ? (
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
              >
                <ExternalLink className="h-3 w-3" /> {meetLink} (fixo)
              </a>
            ) : (
              <p className="mt-2 text-xs text-warning">
                Sem link ainda — é gerado automaticamente se o responsável tiver o Google Calendar conectado, ou defina um fixo em Configurações → Agenda.
              </p>
            )}
            <div className="mt-2">
              <EmailsChipsInput
                value={emailsConvidados}
                onChange={setEmailsConvidados}
                placeholder="E-mails extras pro convite"
              />
            </div>
          </>
        )}
        {modalidade === "whatsapp" && (
          <p className="mt-2 text-xs text-fg-subtle">A reunião será feita por ligação no número do lead.</p>
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

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="danger" size="sm" loading={excluindo} onClick={excluir}>
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
        <Button size="sm" loading={loading} onClick={salvar}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>
    </div>
  );
}
