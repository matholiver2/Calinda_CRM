"use client";

import { useState } from "react";
import useSWR from "swr";
import { BarChart, Bar, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, Percent, Clock, Users, ArrowUpRight, Calendar, Download } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher } from "@/lib/fetcher";
import { CARD, CARD_LG } from "@/lib/utils";

type Relatorio = {
  conversaoPorEtapa: { etapa: string; cor: string; ordem: number; alcancaram: number }[];
  tempoMedioPorEtapa: { etapa: string; cor: string; horasMedia: number }[];
  origemLeads: { origem: string; total: number; percentual: number }[];
  performancePorVendedor: {
    vendedorId: string;
    nome: string;
    avatarCor: string;
    leadsAtribuidos: number;
    reunioesRealizadas: number;
    reunioesFechadas: number;
    taxaFechamento: number;
  }[];
};

export default function RelatoriosPage() {
  const { data, isLoading } = useSWR<Relatorio>("/api/relatorios/conversao", fetcher);
  const [exportando, setExportando] = useState(false);

  if (isLoading || !data) {
    return <div className="py-20 text-center text-sm text-fg-subtle">Carregando relatórios...</div>;
  }

  const totalLeads = data.conversaoPorEtapa[0]?.alcancaram ?? 0;
  const fechados = data.conversaoPorEtapa[data.conversaoPorEtapa.length - 1]?.alcancaram ?? 0;
  const taxaConversao = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0;
  const tempoMedioGeral =
    data.tempoMedioPorEtapa.length > 0
      ? Math.round(data.tempoMedioPorEtapa.reduce((s, e) => s + e.horasMedia, 0) / data.tempoMedioPorEtapa.length)
      : 0;
  const vendedoresAtivos = data.performancePorVendedor.length;

  const etapaTopo = [...data.conversaoPorEtapa].sort((a, b) => b.alcancaram - a.alcancaram)[0]?.etapa;

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-fg">Relatórios</h1>
          <p className="mt-1 text-sm text-fg-subtle">Conversão por etapa, tempo médio, origem dos leads e performance do time</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover">
            <Calendar className="h-4 w-4 text-fg-subtle" />
            29 Jun, 2025 - 29 Ago, 2025
          </button>
          <Button size="sm" onClick={() => setExportando(true)}>
            <Download className="h-3.5 w-3.5" /> Exportar PDF
          </Button>
        </div>
      </div>

      <ExportarRelatorioDialog open={exportando} onClose={() => setExportando(false)} />

      {/* Row 1: stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Total de Leads" value={totalLeads.toLocaleString("pt-BR")} />
        <StatCard icon={Percent} label="Taxa de Conversão" value={`${taxaConversao}%`} />
        <StatCard icon={Clock} label="Tempo Médio Geral" value={`${tempoMedioGeral}h`} />
        <StatCard icon={Users} label="Vendedores Ativos" value={String(vendedoresAtivos)} />
      </div>

      {/* Row 2: main chart + tempo médio */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className={CARD_LG}>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-fg">Conversão por Etapa</h3>
                <p className="text-xs text-fg-subtle">Leads que alcançaram cada etapa do funil</p>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.conversaoPorEtapa} barCategoryGap="40%">
                <Bar dataKey="alcancaram" radius={[8, 8, 0, 0]}>
                  {data.conversaoPorEtapa.map((e) => (
                    <Cell key={e.etapa} fill={e.etapa === etapaTopo ? "#15803d" : "#bbe3c8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-between text-xs text-fg-subtle">
            {data.conversaoPorEtapa.map((e) => (
              <span key={e.etapa} className="truncate px-1 text-center">
                {e.etapa}
              </span>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Tempo Médio por Etapa</h3>
              <p className="text-xs text-fg-subtle">Em horas, até a transição</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-4">
            {data.tempoMedioPorEtapa.map((e) => (
              <div key={e.etapa}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-fg-muted">{e.etapa}</span>
                  <span className="text-fg-subtle">{e.horasMedia}h</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(100, (e.horasMedia / Math.max(1, ...data.tempoMedioPorEtapa.map((x) => x.horasMedia))) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: origem + performance */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className={CARD_LG}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Performance por Vendedor</h3>
              <p className="text-xs text-fg-subtle">Reuniões realizadas e taxa de fechamento</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          {/* Mobile: lista empilhada, sem scroll horizontal */}
          <div className="space-y-2 sm:hidden">
            {data.performancePorVendedor.map((v) => (
              <div key={v.vendedorId} className="flex items-center justify-between gap-2 rounded-[10px] border border-border p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar nome={v.nome} cor={v.avatarCor} size="sm" />
                  <p className="truncate font-medium text-fg">{v.nome}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-fg-subtle">
                  <span>{v.leadsAtribuidos} leads</span>
                  <span>{v.reunioesRealizadas} reuniões</span>
                  <span className="font-medium text-accent">{v.taxaFechamento}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="pb-4 pr-4 font-medium">Vendedor</th>
                <th className="pb-4 pr-4 font-medium">Leads</th>
                <th className="pb-4 pr-4 font-medium">Reuniões</th>
                <th className="pb-4 text-right font-medium">Fechamento</th>
              </tr>
            </thead>
            <tbody>
              {data.performancePorVendedor.map((v) => (
                <tr key={v.vendedorId} className="border-t border-border">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar nome={v.nome} cor={v.avatarCor} size="sm" />
                      <p className="font-medium text-fg">{v.nome}</p>
                    </div>
                  </td>
                  <td className="pr-4 text-fg-muted">{v.leadsAtribuidos}</td>
                  <td className="pr-4 text-fg-muted">{v.reunioesRealizadas}</td>
                  <td className="text-right font-medium text-accent">{v.taxaFechamento}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {data.performancePorVendedor.length === 0 && (
            <p className="py-10 text-center text-sm text-fg-subtle">Nenhum vendedor cadastrado.</p>
          )}
        </div>

        <div className={CARD}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Origem dos Leads</h3>
              <p className="text-[11px] text-fg-subtle">Por canal de aquisição</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="space-y-4">
            {data.origemLeads
              .sort((a, b) => b.total - a.total)
              .map((o) => (
                <div key={o.origem}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-fg-muted">{o.origem}</span>
                    <span className="text-fg-subtle">
                      {o.total} · {o.percentual}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${o.percentual}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className={CARD}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mb-1 text-xs text-fg-subtle">{label}</p>
      <p className="text-2xl font-bold text-fg">{value}</p>
    </div>
  );
}

const SECOES_DISPONIVEIS: { id: string; label: string }[] = [
  { id: "conversao", label: "Conversão por Etapa" },
  { id: "tempo", label: "Tempo Médio por Etapa" },
  { id: "performance", label: "Performance por Vendedor" },
  { id: "origem", label: "Origem dos Leads" },
];

function ExportarRelatorioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selecionadas, setSelecionadas] = useState<string[]>(SECOES_DISPONIVEIS.map((s) => s.id));
  const [gerando, setGerando] = useState(false);

  function alternar(id: string) {
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function gerar() {
    if (selecionadas.length === 0) return;
    setGerando(true);
    // Abre a aba já no clique (síncrono) — esperar o fetch terminar antes de
    // chamar window.open faria o navegador bloquear como popup não solicitado.
    const aba = window.open("", "_blank");
    try {
      const res = await fetch("/api/relatorios/conversao/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secoes: selecionadas }),
      });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (aba) aba.location.href = url;
      else window.open(url, "_blank");
      onClose();
    } catch {
      aba?.close();
      alert("Erro ao gerar o PDF do relatório");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Exportar relatório em PDF">
      <div className="space-y-4">
        <p className="text-sm text-fg-subtle">Escolha o que entra no PDF (os cards de resumo sempre aparecem no topo).</p>
        <div className="space-y-2">
          {SECOES_DISPONIVEIS.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3.5 py-2.5 text-sm text-fg hover:bg-surface-hover">
              <input type="checkbox" checked={selecionadas.includes(s.id)} onChange={() => alternar(s.id)} />
              {s.label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={gerar} loading={gerando} disabled={selecionadas.length === 0}>
            <Download className="h-3.5 w-3.5" /> Gerar PDF
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
