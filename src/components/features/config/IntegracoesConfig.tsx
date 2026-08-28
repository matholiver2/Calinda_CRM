"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { MessageCircle, Sparkles, CalendarDays, CheckCircle2, CircleAlert, QrCode, LogIn } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost } from "@/lib/fetcher";

type Integracoes = {
  whatsapp: { provider: string; configurado: boolean };
  ia: { provider: string; configurado: boolean };
  calendario: { provider: string; configurado: boolean };
};

type SessaoWhatsapp = {
  status: "desconectado" | "conectando" | "conectado";
  numeroConectado: string | null;
};

const STATUS_LABEL: Record<SessaoWhatsapp["status"], string> = {
  desconectado: "Desconectado",
  conectando: "Conectando...",
  conectado: "Conectado",
};

const STATUS_COR: Record<SessaoWhatsapp["status"], string> = {
  desconectado: "#71717a",
  conectando: "#F59E0B",
  conectado: "#10B981",
};

export function IntegracoesConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data } = useSWR<Integracoes>("/api/integracoes", fetcher);

  const itens = data
    ? [
        {
          nome: "Inteligência Artificial",
          icon: Sparkles,
          provider: data.ia.configurado ? data.ia.provider : "Simulador local (modo demo)",
          configurado: data.ia.configurado,
          envVars: "GEMINI_API_KEY",
        },
      ]
    : [];

  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted">
        Credenciais são definidas por variáveis de ambiente (arquivo <code className="rounded bg-bg-elevated px-1 py-0.5 text-xs">.env</code>) e
        nunca ficam expostas na interface. Sem credenciais, o sistema roda em modo demo com simuladores.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data && <WhatsappCard whatsapp={data.whatsapp} podeEditar={podeEditar} />}
        <GoogleCalendarCard />
        {itens.map((item) => (
          <Card key={item.nome} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                <item.icon className="h-4.5 w-4.5" />
              </div>
              {item.configurado ? (
                <Badge color="#10B981">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge color="#F59E0B">
                  <CircleAlert className="h-3 w-3" /> Modo demo
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-fg">{item.nome}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">{item.provider}</p>
            <p className="mt-2 truncate text-[10px] text-fg-subtle" title={item.envVars}>
              {item.envVars}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WhatsappCard({
  whatsapp,
  podeEditar,
}: {
  whatsapp: Integracoes["whatsapp"];
  podeEditar: boolean;
}) {
  const [conectando, setConectando] = useState(false);
  const { data: sessao, mutate } = useSWR<SessaoWhatsapp>("/api/whatsapp/sessao", fetcher, {
    refreshInterval: 5000,
  });
  const status = sessao?.status ?? "desconectado";

  return (
    <>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
            <MessageCircle className="h-4.5 w-4.5" />
          </div>
          <Badge color={STATUS_COR[status]}>
            {status === "conectado" ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
            {STATUS_LABEL[status]}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-fg">WhatsApp (não-oficial)</p>
        <p className="mt-0.5 text-xs text-fg-subtle">
          {status === "conectado" && sessao?.numeroConectado
            ? sessao.numeroConectado
            : "Conexão direta via QR code (Baileys)"}
        </p>
        <p className="mt-1 text-[10px] text-fg-subtle">
          {whatsapp.provider === "mock" ? "Fallback: simulador (modo demo)" : "Fallback: Meta Cloud API"}
        </p>
        {podeEditar && (
          <div className="mt-3">
            {status === "conectado" ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={async () => {
                  if (!confirm("Desconectar este número do WhatsApp?")) return;
                  await apiPost("/api/whatsapp/disconnect");
                  mutate();
                }}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={async () => {
                  setConectando(true);
                  await apiPost("/api/whatsapp/connect");
                  mutate();
                }}
              >
                <QrCode className="h-3.5 w-3.5" /> Conectar
              </Button>
            )}
          </div>
        )}
      </Card>

      <ConectarWhatsappDialog
        open={conectando}
        onClose={() => setConectando(false)}
        conectado={status === "conectado"}
      />
    </>
  );
}

function ConectarWhatsappDialog({
  open,
  onClose,
  conectado,
}: {
  open: boolean;
  onClose: () => void;
  conectado: boolean;
}) {
  const { data } = useSWR<{ qr: string | null }>(open ? "/api/whatsapp/qr" : null, fetcher, {
    refreshInterval: 2000,
  });

  useEffect(() => {
    if (conectado && open) onClose();
  }, [conectado, open, onClose]);

  return (
    <Dialog open={open} onClose={onClose} title="Conectar WhatsApp">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-fg-muted">
          Abra o WhatsApp no celular que vai ser usado, vá em Aparelhos conectados → Conectar um aparelho, e
          escaneie o código abaixo.
        </p>
        <div className="flex h-80 w-80 items-center justify-center rounded-xl border border-border-strong bg-white p-3">
          {data?.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.qr} alt="QR code do WhatsApp" className="h-full w-full object-contain" />
          ) : (
            <p className="px-4 text-xs text-fg-subtle">Gerando QR code...</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

type SessaoGoogleCalendar = { conectado: boolean; email: string | null };

function GoogleCalendarCard() {
  const { data: sessao, mutate } = useSWR<SessaoGoogleCalendar>("/api/google-calendar/status", fetcher);
  const conectado = sessao?.conectado ?? false;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <CalendarDays className="h-4.5 w-4.5" />
        </div>
        <Badge color={conectado ? "#10B981" : "#71717a"}>
          {conectado ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
          {conectado ? "Conectado" : "Desconectado"}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-fg">Google Calendar</p>
      <p className="mt-0.5 truncate text-xs text-fg-subtle">
        {conectado && sessao?.email ? sessao.email : "Sincroniza suas reuniões automaticamente"}
      </p>
      <p className="mt-1 text-[10px] text-fg-subtle">Conexão pessoal — cada usuário conecta o próprio Google</p>
      <div className="mt-3">
        {conectado ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={async () => {
              if (!confirm("Desconectar seu Google Calendar?")) return;
              await apiPost("/api/google-calendar/disconnect");
              mutate();
            }}
          >
            Desconectar
          </Button>
        ) : (
          <a
            href="/api/auth/google-calendar"
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
          >
            <LogIn className="h-3.5 w-3.5" /> Conectar
          </a>
        )}
      </div>
    </Card>
  );
}
