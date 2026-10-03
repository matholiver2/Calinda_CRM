"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { CalendarClock, Clock, X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher, apiPost, apiDelete, ApiError } from "@/lib/fetcher";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FollowUpAgendado = {
  id: string;
  enviarEm: string;
  enviadoEm: string | null;
  status: "pendente" | "enviado" | "cancelado" | "falhou";
  textoPersonalizado: string | null;
  erro: string | null;
  criadoEm: string;
};

const PRESETS: { label: string; horas?: number; dias?: number; amanha9h?: boolean }[] = [
  { label: "Em 1 hora", horas: 1 },
  { label: "Em 3 horas", horas: 3 },
  { label: "Amanhã às 9h", amanha9h: true },
  { label: "Em 2 dias", dias: 2 },
];

function calcularPreset(preset: (typeof PRESETS)[number]): Date {
  const agora = new Date();
  if (preset.amanha9h) {
    const d = new Date(agora);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (preset.dias) return new Date(agora.getTime() + preset.dias * 86_400_000);
  if (preset.horas) return new Date(agora.getTime() + preset.horas * 3_600_000);
  return agora;
}

export function FollowUpButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ followUps: FollowUpAgendado[] }>(
    open ? `/api/leads/${leadId}/follow-ups` : null,
    fetcher
  );
  const pendentes = (data?.followUps ?? []).filter((f) => f.status === "pendente");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        Follow-up{pendentes.length > 0 ? ` (${pendentes.length})` : ""}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Follow-up" maxWidth="max-w-lg">
        {open && <FollowUpConteudo leadId={leadId} followUps={data?.followUps ?? []} />}
      </Dialog>
    </>
  );
}

function FollowUpConteudo({ leadId, followUps }: { leadId: string; followUps: FollowUpAgendado[] }) {
  const [dataCustom, setDataCustom] = useState("");
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pendentes = followUps.filter((f) => f.status === "pendente");
  const historico = followUps.filter((f) => f.status !== "pendente").slice(0, 10);

  async function agendar(enviarEm: Date) {
    setErro(null);
    setSalvando(true);
    try {
      await apiPost(`/api/leads/${leadId}/follow-ups`, {
        enviarEm: enviarEm.toISOString(),
        textoPersonalizado: texto.trim() || undefined,
      });
      setTexto("");
      setDataCustom("");
      mutate(`/api/leads/${leadId}/follow-ups`);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao agendar follow-up");
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar(id: string) {
    await apiDelete(`/api/follow-ups/${id}`);
    mutate(`/api/leads/${leadId}/follow-ups`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium text-fg-muted">Agendar para...</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" variant="secondary" size="sm" disabled={salvando} onClick={() => agendar(calcularPreset(p))}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            type="datetime-local"
            value={dataCustom}
            onChange={(e) => setDataCustom(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!dataCustom || salvando}
            onClick={() => dataCustom && agendar(new Date(dataCustom))}
          >
            Escolher
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">
          Mensagem (opcional — se vazio, a IA escreve uma mensagem de reengajamento na hora do envio)
        </p>
        <Textarea
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: Oi! Conseguiu ver a proposta que te mandei?"
        />
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      {pendentes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Agendados</p>
          <div className="space-y-1.5">
            {pendentes.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{format(new Date(f.enviarEm), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  <Contagem alvo={f.enviarEm} />
                </div>
                <button
                  onClick={() => cancelar(f.id)}
                  title="Cancelar"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Histórico</p>
          <div className="space-y-1.5">
            {historico.map((f) => (
              <div key={f.id} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                {f.status === "enviado" && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />}
                {f.status === "cancelado" && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                {f.status === "falhou" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />}
                <div className="min-w-0">
                  <p className="text-fg">
                    {format(new Date(f.enviarEm), "dd/MM 'às' HH:mm", { locale: ptBR })} ·{" "}
                    {f.status === "enviado" ? "enviado" : f.status === "cancelado" ? "cancelado" : "falhou"}
                  </p>
                  {f.erro && <p className="mt-0.5 text-danger">{f.erro}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Contagem({ alvo }: { alvo: string }) {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    function tick() {
      const ms = new Date(alvo).getTime() - Date.now();
      if (ms <= 0) return setTexto("enviando...");
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setTexto(h > 0 ? `em ${h}h ${m}min` : `em ${m}min`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [alvo]);
  return (
    <span className={cn("flex items-center gap-1 text-fg-subtle")}>
      <Clock className="h-3 w-3" /> {texto}
    </span>
  );
}
