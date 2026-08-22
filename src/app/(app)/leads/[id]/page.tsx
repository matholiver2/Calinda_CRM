"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Tag, Calendar, UserCheck, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { ChatThread } from "@/components/features/ChatThread";
import { fetcher, apiPatch } from "@/lib/fetcher";
import { formatarTelefone, statusLabel } from "@/lib/utils";
import type { Etapa, Lead } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COR: Record<string, string> = {
  ativo: "#3B82F6",
  cliente: "#10B981",
  perdido: "#EF4444",
  remarketing: "#A78BFA",
};

type LeadDetalhe = Lead & {
  reunioes: { id: string; dataHora: string; status: string; resultado: string }[];
};

export default function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSWR<{ lead: LeadDetalhe }>(`/api/leads/${id}`, fetcher, {
    refreshInterval: 4000,
  });
  const { data: etapasData } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const [novaEtapa, setNovaEtapa] = useState("");

  const lead = data?.lead;
  const etapas = etapasData?.etapas ?? [];

  async function moverEtapa() {
    if (!novaEtapa || !lead) return;
    await apiPatch(`/api/leads/${id}/etapa`, { etapaId: novaEtapa });
    setNovaEtapa("");
    mutate(`/api/leads/${id}`);
    mutate("/api/leads");
  }

  async function marcarComoCliente() {
    if (!confirm("Marcar este lead como cliente? Ele passa a aparecer na carteira de Clientes.")) return;
    await apiPatch(`/api/leads/${id}`, { status: "cliente" });
    mutate(`/api/leads/${id}`);
    mutate("/api/leads");
  }

  if (isLoading || !lead) {
    return <div className="py-20 text-center text-sm text-fg-muted">Carregando lead...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={lead.nome} size="lg" />
                <div>
                  <h1 className="text-lg font-bold text-fg">{lead.nome}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge color={lead.etapaAtual.cor}>{lead.etapaAtual.nome}</Badge>
                    <Badge color={STATUS_COR[lead.status]}>{statusLabel(lead.status)}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/orcamentos?leadId=${id}`}>
                  <Button variant="secondary" size="sm">
                    <FileText className="h-3.5 w-3.5" /> Criar orçamento
                  </Button>
                </Link>
                {lead.status !== "cliente" && (
                  <Button size="sm" onClick={marcarComoCliente}>
                    <UserCheck className="h-3.5 w-3.5" /> Marcar como Cliente
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="min-h-[420px] flex-1">
            <ChatThread leadId={id} />
          </div>
        </div>

        {/* Coluna lateral: dados */}
        <div className="space-y-4 overflow-y-auto">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Dados de contato</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-fg-muted">
                <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="font-mono">{formatarTelefone(lead.telefone)}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-fg-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="font-mono">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-fg-muted">
                <Tag className="h-3.5 w-3.5 shrink-0" /> {lead.origem}
              </div>
              <div className="flex items-center gap-2 text-fg-muted">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Entrou {formatDistanceToNow(new Date(lead.entrouEm), { addSuffix: true, locale: ptBR })}
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Vendedor responsável</h2>
            {lead.vendedor ? (
              <div className="flex items-center gap-2.5">
                <Avatar nome={lead.vendedor.nome} cor={lead.vendedor.avatarCor} size="sm" />
                <div>
                  <p className="text-sm font-medium text-fg">{lead.vendedor.nome}</p>
                  <p className="text-xs text-fg-subtle">{lead.vendedor.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-fg-subtle">Ainda não atribuído (IA conduzindo)</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Mover etapa manualmente</h2>
            <div className="space-y-2">
              <Select value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)}>
                <option value="">Selecionar etapa...</option>
                {etapas
                  .filter((e) => e.id !== lead.etapaAtualId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
              </Select>
              <Button variant="secondary" className="w-full" disabled={!novaEtapa} onClick={moverEtapa}>
                Mover lead
              </Button>
            </div>
          </Card>

          {lead.reunioes.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-fg">Reuniões</h2>
              <div className="space-y-2">
                {lead.reunioes.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <p className="font-medium text-fg">
                      {format(new Date(r.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="mt-1 text-fg-subtle">
                      Status: {r.status} · Resultado: {r.resultado}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
