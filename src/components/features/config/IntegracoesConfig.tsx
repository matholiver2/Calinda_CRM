"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  MessageCircle,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  QrCode,
  LogIn,
  Stethoscope,
  XCircle,
  Loader2,
  Target,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { fetcher, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";

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
        <ApifyCard podeEditar={podeEditar} />
        <DiagnosticoCard />
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

type Checagem = { chave: string; label: string; ok: boolean; detalhe: string };

function DiagnosticoCard() {
  const [rodando, setRodando] = useState(false);
  const [checagens, setChecagens] = useState<Checagem[] | null>(null);

  async function testar() {
    setRodando(true);
    try {
      const resultado = await fetcher<{ ok: boolean; checagens: Checagem[] }>("/api/diagnostico");
      setChecagens(resultado.checagens);
    } catch {
      setChecagens(null);
    } finally {
      setRodando(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <Stethoscope className="h-4.5 w-4.5" />
        </div>
        {checagens && (
          <Badge color={checagens.every((c) => c.ok) ? "#10B981" : "#EF4444"}>
            {checagens.every((c) => c.ok) ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
            {checagens.every((c) => c.ok) ? "Tudo certo" : "Problemas encontrados"}
          </Badge>
        )}
      </div>
      <p className="text-sm font-semibold text-fg">Diagnóstico da conexão</p>
      <p className="mt-0.5 text-xs text-fg-subtle">Testa banco, IA e WhatsApp de uma vez</p>

      {checagens && (
        <div className="mt-3 space-y-1.5">
          {checagens.map((c) => (
            <div key={c.chave} className="flex items-start gap-1.5 text-xs">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
              )}
              <div className="min-w-0">
                <span className="font-medium text-fg">{c.label}:</span>{" "}
                <span className="text-fg-subtle">{c.detalhe}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <Button variant="secondary" size="sm" className="w-full" onClick={testar} disabled={rodando}>
          {rodando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
          {rodando ? "Testando..." : "Testar conexão"}
        </Button>
      </div>
    </Card>
  );
}

function ApifyCard({ podeEditar }: { podeEditar: boolean }) {
  const { data, mutate } = useSWR<{ configurado: boolean }>("/api/prospeccao/config", fetcher);
  const [dialogAberto, setDialogAberto] = useState(false);
  const configurado = data?.configurado ?? false;

  return (
    <>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
            <Target className="h-4.5 w-4.5" />
          </div>
          <Badge color={configurado ? "#10B981" : "#71717a"}>
            {configurado ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
            {configurado ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-fg">Apify (prospecção)</p>
        <p className="mt-0.5 text-xs text-fg-subtle">Usado pra extrair leads do Google Maps na tela Prospecção</p>
        <p className="mt-1 text-[10px] text-fg-subtle">Token da empresa — vale pra todos os usuários</p>
        {podeEditar ? (
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setDialogAberto(true)}>
              <KeyRound className="h-3.5 w-3.5" /> {configurado ? "Trocar token" : "Configurar"}
            </Button>
            {configurado && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!confirm("Remover o token da Apify? A prospecção deixa de funcionar pra todo mundo da empresa.")) return;
                  await apiDelete("/api/prospeccao/config");
                  mutate();
                }}
              >
                Remover
              </Button>
            )}
          </div>
        ) : (
          !configurado && <p className="mt-3 text-[11px] text-fg-subtle">Peça pra um admin configurar aqui.</p>
        )}
      </Card>

      <ApifyTokenDialog
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
        onSaved={() => {
          mutate();
          setDialogAberto(false);
        }}
      />
    </>
  );
}

function ApifyTokenDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!token.trim()) return setErro("Cole o token da Apify");
    setSalvando(true);
    setErro(null);
    try {
      await apiPatch("/api/prospeccao/config", { token: token.trim() });
      setToken("");
      onSaved();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar token");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Conectar Apify">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          A prospecção usa a <strong>Apify</strong> pra extrair leads do Google Maps. Crie uma conta gratuita em{" "}
          <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            console.apify.com
          </a>
          , copie sua Personal API token em Settings → API &amp; Integrations, e cole abaixo. Esse token vale pra
          toda a empresa — qualquer usuário vai poder usar a prospecção depois de configurado.
        </p>
        <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="apify_api_..." />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <Button className="w-full" onClick={salvar} loading={salvando}>
          <KeyRound className="h-3.5 w-3.5" /> Validar e salvar
        </Button>
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
