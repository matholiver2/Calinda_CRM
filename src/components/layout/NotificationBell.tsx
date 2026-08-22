"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { fetcher, apiPatch, apiPost } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type NotificacaoItem = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  leadId: string | null;
  lida: boolean;
  criadoEm: string;
};

function tocarBeep() {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ambiente sem suporte a Web Audio — silenciosamente ignora
  }
}

function formatarQuando(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function NotificationBell() {
  const router = useRouter();
  const { data, mutate } = useSWR<{ notificacoes: NotificacaoItem[]; naoLidas: number }>(
    "/api/notificacoes",
    fetcher,
    { refreshInterval: 20_000 }
  );
  const [aberto, setAberto] = useState(false);
  const naoLidasAnteriorRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const naoLidas = data?.naoLidas ?? 0;
    if (naoLidasAnteriorRef.current !== null && naoLidas > naoLidasAnteriorRef.current) {
      tocarBeep();
    }
    naoLidasAnteriorRef.current = naoLidas;
  }, [data?.naoLidas]);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickFora);
      document.removeEventListener("keydown", onEsc);
    };
  }, [aberto]);

  async function abrirNotificacao(n: NotificacaoItem) {
    if (!n.lida) {
      await apiPatch(`/api/notificacoes/${n.id}`, { lida: true });
      mutate();
    }
    if (n.leadId) {
      setAberto(false);
      router.push(`/leads/${n.leadId}`);
    }
  }

  async function marcarTodasLidas() {
    await apiPost("/api/notificacoes/marcar-todas-lidas");
    mutate();
  }

  const naoLidas = data?.naoLidas ?? 0;
  const notificacoes = data?.notificacoes ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-fg-muted hover:bg-border"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-[72px] z-50 rounded-[14px] border border-border bg-bg-elevated shadow-[var(--shadow-float)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notificações</p>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs font-medium text-accent hover:text-accent-hover">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {notificacoes.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-subtle">Nenhuma notificação ainda.</p>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrirNotificacao(n)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover",
                    !n.lida && "bg-accent-soft"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{n.titulo}</p>
                    <span className="shrink-0 text-[11px] text-fg-subtle">{formatarQuando(n.criadoEm)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">{n.corpo}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
