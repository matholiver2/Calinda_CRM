"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Plus, Search, Bot, BotOff, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { NovoLeadDialog } from "@/components/features/NovoLeadDialog";
import { fetcher, apiDelete, ApiError } from "@/lib/fetcher";
import { formatarTelefone, statusLabel } from "@/lib/utils";
import type { Etapa, Lead } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COR: Record<string, string> = {
  ativo: "#3B82F6",
  cliente: "#10B981",
  perdido: "#EF4444",
  remarketing: "#A78BFA",
};

export default function LeadsPage() {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher, { refreshInterval: 8000 });
  const { data: etapasData } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const { data: meData } = useSWR<{ usuario: { papel: string } }>("/api/auth/me", fetcher);

  const [busca, setBusca] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState("");
  const [novoLeadAberto, setNovoLeadAberto] = useState(false);

  const leads = useMemo(() => leadsData?.leads ?? [], [leadsData]);
  const etapas = etapasData?.etapas ?? [];
  const origens = useMemo(() => Array.from(new Set(leads.map((l) => l.origem))), [leads]);
  const podeExcluir = meData?.usuario?.papel && meData.usuario.papel !== "vendedor";

  async function remover(id: string, nome: string) {
    if (!confirm(`Excluir o lead "${nome}"? Isso apaga também as mensagens e o histórico dele. Não tem como desfazer.`)) return;
    try {
      await apiDelete(`/api/leads/${id}`);
      mutate("/api/leads");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir lead");
    }
  }

  const filtrados = leads.filter((l) => {
    if (busca && !`${l.nome} ${l.telefone} ${l.email ?? ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (etapaFiltro && l.etapaAtualId !== etapaFiltro) return false;
    if (statusFiltro && l.status !== statusFiltro) return false;
    if (origemFiltro && l.origem !== origemFiltro) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${filtrados.length} de ${leads.length} leads`}
        actions={
          <Button onClick={() => setNovoLeadAberto(true)}>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail"
            className="pl-10"
          />
        </div>
        <div className="w-[160px] shrink-0">
          <Select value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value)}>
            <option value="">Todas as etapas</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-[140px] shrink-0">
          <Select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="cliente">Cliente</option>
            <option value="perdido">Perdido</option>
            <option value="remarketing">Remarketing</option>
            <option value="finalizado">Finalizado</option>
          </Select>
        </div>
        <div className="w-[160px] shrink-0">
          <Select value={origemFiltro} onChange={(e) => setOrigemFiltro(e.target.value)}>
            <option value="">Todas as origens</option>
            {origens.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Mobile: cards empilhados, sem scroll horizontal */}
      <div className="space-y-2.5 sm:hidden">
        {filtrados.map((lead) => (
          <Card key={lead.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/leads/${lead.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nome={lead.nome} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{lead.nome}</p>
                  <p className="font-mono text-xs text-fg-subtle">{formatarTelefone(lead.telefone)}</p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {lead.iaAtiva ? (
                  <Bot className="h-4 w-4 text-accent" />
                ) : (
                  <BotOff className="h-4 w-4 text-fg-subtle" />
                )}
                {podeExcluir && (
                  <button
                    onClick={() => remover(lead.id, lead.nome)}
                    title="Excluir lead"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge color={lead.etapaAtual.cor}>{lead.etapaAtual.nome}</Badge>
              <Badge color={STATUS_COR[lead.status]}>{statusLabel(lead.status)}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
              <span>{lead.origem}</span>
              <span>{lead.vendedor ? lead.vendedor.nome : "Sem vendedor"}</span>
              <span>{format(new Date(lead.entrouEm), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-subtle">Nenhum lead encontrado.</p>
        )}
      </div>

      {/* Desktop/tablet: tabela */}
      <Card className="hidden overflow-hidden p-7 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="pb-4 pr-4 font-medium">Lead</th>
                <th className="pb-4 pr-4 font-medium">Etapa</th>
                <th className="pb-4 pr-4 font-medium">Status</th>
                <th className="pb-4 pr-4 font-medium">Origem</th>
                <th className="pb-4 pr-4 font-medium">Vendedor</th>
                <th className="pb-4 pr-4 font-medium">IA</th>
                <th className="pb-4 pr-4 font-medium">Entrou em</th>
                {podeExcluir && <th className="pb-4 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="py-4 pr-4">
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3">
                      <Avatar nome={lead.nome} size="sm" />
                      <div>
                        <p className="font-medium text-fg">{lead.nome}</p>
                        <p className="font-mono text-xs text-fg-subtle">{formatarTelefone(lead.telefone)}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="pr-4">
                    <Badge color={lead.etapaAtual.cor}>{lead.etapaAtual.nome}</Badge>
                  </td>
                  <td className="pr-4">
                    <Badge color={STATUS_COR[lead.status]}>{statusLabel(lead.status)}</Badge>
                  </td>
                  <td className="pr-4 text-fg-muted">{lead.origem}</td>
                  <td className="pr-4 text-fg-muted">
                    {lead.vendedor ? lead.vendedor.nome : <span className="text-fg-subtle">—</span>}
                  </td>
                  <td className="pr-4">
                    {lead.iaAtiva ? (
                      <Bot className="h-4 w-4 text-accent" />
                    ) : (
                      <BotOff className="h-4 w-4 text-fg-subtle" />
                    )}
                  </td>
                  <td className="pr-4 text-fg-muted">
                    {format(new Date(lead.entrouEm), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  {podeExcluir && (
                    <td>
                      <button
                        onClick={() => remover(lead.id, lead.nome)}
                        title="Excluir lead"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <p className="py-10 text-center text-sm text-fg-subtle">Nenhum lead encontrado.</p>
          )}
        </div>
      </Card>

      <NovoLeadDialog open={novoLeadAberto} onClose={() => setNovoLeadAberto(false)} />
    </div>
  );
}
