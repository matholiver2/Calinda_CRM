"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Search, Bot, BotOff, MessageCircleOff, QrCode } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { ChatThread } from "@/components/features/ChatThread";
import { fetcher, apiPatch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type SessaoWhatsapp = { status: "desconectado" | "conectando" | "conectado" };
type Integracoes = { whatsapp: { provider: string; configurado: boolean } };

export default function ConversasPage() {
  const { data: sessao, isLoading: carregandoSessao } = useSWR<SessaoWhatsapp>(
    "/api/whatsapp/sessao",
    fetcher,
    { refreshInterval: 5000 }
  );
  const { data: integracoes, isLoading: carregandoIntegracoes } = useSWR<Integracoes>(
    "/api/integracoes",
    fetcher
  );

  const carregando = carregandoSessao || carregandoIntegracoes;
  const whatsappConectado = sessao?.status === "conectado" || !!integracoes?.whatsapp.configurado;

  return (
    <div className="flex h-full min-h-[180vh] flex-col">
      <PageHeader
        title="Conversas com IA"
        description="Acompanhe em tempo real as conversas conduzidas pela IA e intervenha quando necessário"
      />

      {!carregando && !whatsappConectado ? (
        <WhatsappDesconectado />
      ) : (
        <ConversasConteudo />
      )}
    </div>
  );
}

function WhatsappDesconectado() {
  return (
    <Card className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
        <MessageCircleOff className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-semibold text-fg">Favor conectar no WhatsApp nas configurações</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-subtle">
          As conversas aparecem aqui assim que o número da empresa estiver conectado. Ninguém consegue enviar
          nem receber mensagens enquanto isso não for feito.
        </p>
      </div>

      <ol className="mt-2 w-full max-w-sm space-y-2.5 text-left text-sm text-fg-muted">
        <li className="flex gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            1
          </span>
          Vá em <span className="font-medium text-fg">Configurações → Integrações</span>
        </li>
        <li className="flex gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            2
          </span>
          No card <span className="font-medium text-fg">WhatsApp (não-oficial)</span>, clique em{" "}
          <span className="font-medium text-fg">Conectar</span>
        </li>
        <li className="flex gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            3
          </span>
          No celular, abra o WhatsApp → Aparelhos conectados → Conectar um aparelho, e escaneie o QR code
        </li>
      </ol>

      <Link
        href="/configuracoes?tab=integracoes"
        className="mt-2 flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        <QrCode className="h-4 w-4" /> Ir para Integrações
      </Link>
    </Card>
  );
}

function ConversasConteudo() {
  const { data } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher, { refreshInterval: 5000 });
  const [busca, setBusca] = useState("");
  const [somenteIa, setSomenteIa] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const leads = useMemo(() => {
    const todos = (data?.leads ?? []).filter((l) => (l._count?.mensagens ?? 0) > 0 || l.status === "ativo");
    const comFiltro = todos
      .filter((l) => !somenteIa || l.iaAtiva)
      .filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()));
    return comFiltro.sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime());
  }, [data, busca, somenteIa]);

  const ativo = selecionado ?? leads[0]?.id ?? null;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-[0.3fr_0.7fr]">
      <Card className="flex min-h-0 flex-col overflow-hidden p-0">
        <div className="space-y-2.5 border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar lead..."
              className="pl-9 text-xs"
            />
          </div>
          <button
            onClick={() => setSomenteIa((v) => !v)}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
              somenteIa
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-fg-muted hover:text-fg"
            )}
          >
            <Bot className="h-3.5 w-3.5" /> Somente IA ativa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.map((lead) => (
            <div
              key={lead.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelecionado(lead.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelecionado(lead.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                ativo === lead.id && "bg-accent-soft"
              )}
            >
              <Avatar nome={lead.nome} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-sm font-medium text-fg">{lead.nome}</p>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await apiPatch(`/api/leads/${lead.id}/ia`, { iaAtiva: !lead.iaAtiva });
                      mutate("/api/leads");
                    }}
                    title={lead.iaAtiva ? "Pausar IA nesta conversa" : "Retomar IA nesta conversa"}
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-full p-1 transition-colors",
                      lead.iaAtiva ? "text-accent hover:bg-accent-soft" : "text-fg-subtle hover:bg-surface-hover"
                    )}
                  >
                    {lead.iaAtiva ? <Bot className="h-3.5 w-3.5" /> : <BotOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <Badge color={lead.etapaAtual.cor} className="!px-1.5 !py-0 text-[10px]">
                    {lead.etapaAtual.nome}
                  </Badge>
                  <span className="text-[10px] text-fg-subtle">
                    {formatDistanceToNow(new Date(lead.atualizadoEm), { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {leads.length === 0 && (
            <p className="py-10 text-center text-xs text-fg-subtle">Nenhuma conversa encontrada.</p>
          )}
        </div>
      </Card>

      <div className="h-full min-h-0 overflow-hidden">
        {ativo ? (
          <ChatThread leadId={ativo} compact />
        ) : (
          <Card className="flex h-full items-center justify-center p-5 text-sm text-fg-subtle">
            Selecione uma conversa
          </Card>
        )}
      </div>
    </div>
  );
}
