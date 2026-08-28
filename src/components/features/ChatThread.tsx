"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { Bot, BotOff, Send, ArrowRightLeft, MessageSquareText, AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetcher, apiPatch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { Etapa, Lead, Mensagem } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LeadDetalhe = Lead & {
  mensagens: Mensagem[];
  historico: { id: string; etapa: Etapa; entrouEm: string; motivoTransicao: string; vendedor: { nome: string } | null }[];
};

export function ChatThread({ leadId, compact = false }: { leadId: string; compact?: boolean }) {
  const { data, isLoading } = useSWR<{ lead: LeadDetalhe }>(`/api/leads/${leadId}`, fetcher, {
    refreshInterval: 3000,
  });
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const lead = data?.lead;

  async function alternarIa() {
    if (!lead) return;
    await apiPatch(`/api/leads/${leadId}/ia`, { iaAtiva: !lead.iaAtiva });
    mutate(`/api/leads/${leadId}`);
  }

  async function enviar() {
    if (!mensagem.trim()) return;
    setEnviando(true);
    try {
      await fetch(`/api/leads/${leadId}/mensagens`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remetente: "vendedor", conteudo: mensagem }),
      });
      setMensagem("");
      mutate(`/api/leads/${leadId}`);
      mutate("/api/leads");
    } finally {
      setEnviando(false);
    }
  }

  if (isLoading || !lead) {
    return <div className="flex h-full items-center justify-center text-sm text-fg-subtle">Carregando conversa...</div>;
  }

  const timeline = [
    ...lead.mensagens.map((m) => ({ tipo: "mensagem" as const, data: m.enviadoEm, item: m })),
    ...(compact
      ? []
      : lead.historico.map((h) => ({ tipo: "etapa" as const, data: h.entrouEm, item: h }))),
  ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <Card className="flex h-full min-h-0 flex-col p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquareText className="h-4 w-4 shrink-0 text-fg-subtle" />
          <p className="truncate text-sm font-semibold text-fg">{lead.nome}</p>
          <Badge color={lead.etapaAtual.cor}>{lead.etapaAtual.nome}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ContagemRespostaIa agendadoPara={lead.respostaIaAgendadaPara} />
          <button
            onClick={alternarIa}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              lead.iaAtiva
                ? "border-accent bg-accent-soft text-accent hover:bg-accent-soft/70"
                : "border-border bg-surface-hover text-fg-muted hover:text-fg"
            )}
          >
            {lead.iaAtiva ? <Bot className="h-3.5 w-3.5" /> : <BotOff className="h-3.5 w-3.5" />}
            {lead.iaAtiva ? "Pausar IA" : "Retomar IA"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {timeline.map((t) =>
          t.tipo === "mensagem" ? (
            <MensagemBubble key={`m-${t.item.id}`} mensagem={t.item} />
          ) : (
            <div key={`e-${t.item.id}`} className="flex items-center gap-2 py-1 text-xs text-fg-subtle">
              <ArrowRightLeft className="h-3 w-3" />
              Entrou em <Badge color={t.item.etapa.cor}>{t.item.etapa.nome}</Badge>
              <span>{format(new Date(t.item.entrouEm), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
            </div>
          )
        )}
        {timeline.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-subtle">Nenhuma mensagem ainda.</p>
        )}
      </div>

      <div className="space-y-2.5 border-t border-border p-4">
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Escreva uma mensagem..."
          rows={2}
          className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-fg-subtle">Enviar como vendedor pausa a IA (handoff manual).</p>
          <Button size="sm" loading={enviando} onClick={enviar}>
            <Send className="h-3.5 w-3.5" /> Enviar
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Contagem regressiva até a IA enviar a próxima mensagem (Lead.respostaIaAgendadaPara). */
function ContagemRespostaIa({ agendadoPara }: { agendadoPara: string | null }) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (!agendadoPara) return;
    const alvo = new Date(agendadoPara).getTime();
    function tick() {
      setSegundosRestantes(Math.max(0, Math.round((alvo - Date.now()) / 1000)));
    }
    // setState só dentro de callbacks (não direto no corpo do efeito) — o
    // primeiro tick roda no próximo ciclo pra já mostrar o valor certo sem
    // esperar 1s pelo primeiro intervalo.
    const imediato = setTimeout(tick, 0);
    const intervalo = setInterval(tick, 1000);
    return () => {
      clearTimeout(imediato);
      clearInterval(intervalo);
    };
  }, [agendadoPara]);

  if (!agendadoPara || segundosRestantes === null || segundosRestantes <= 0) return null;

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  return (
    <span
      title="Tempo até a IA enviar a próxima mensagem"
      className="flex items-center gap-1 rounded-full border border-border bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-fg-muted"
    >
      <Clock className="h-3.5 w-3.5" />
      {minutos}:{String(segundos).padStart(2, "0")}
    </span>
  );
}

function MensagemBubble({ mensagem }: { mensagem: Mensagem }) {
  const isLead = mensagem.remetente === "lead";
  const isIa = mensagem.remetente === "ia";
  return (
    <div className={cn("flex", isLead ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
          isLead && "bg-surface-hover text-fg",
          isIa && "bg-accent-soft text-fg border border-accent/30",
          !isLead && !isIa && "bg-blue-50 text-fg border border-blue-100"
        )}
      >
        <p>{mensagem.conteudo}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-fg-subtle">
          {isLead ? "Lead" : isIa ? "IA" : "Vendedor"} ·{" "}
          {format(new Date(mensagem.enviadoEm), "dd/MM HH:mm", { locale: ptBR })}
          {mensagem.statusEntrega === "falhou" && (
            <span className="ml-1 flex items-center gap-0.5 font-medium text-danger">
              <AlertTriangle className="h-2.5 w-2.5" /> Falha no envio
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
