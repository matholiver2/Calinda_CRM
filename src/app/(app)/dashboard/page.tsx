"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Repeat,
  Zap,
  CreditCard,
  FileText,
  ArrowLeftRight,
  Calendar,
  Plus,
  ChevronDown,
  Check,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { CARD, CARD_LG, iniciais } from "@/lib/utils";

type ResumoDashboard = {
  periodoMeses: number;
  totalMesAtual: number;
  receitaSemana: number;
  receitaPorMes: { mes: string; valor: number }[];
  saldoTrend: number[];
  ultimasVendas: {
    id: string;
    nome: string;
    data: string;
    valor: number;
    formaPagamento: "pix" | "cartao" | "boleto" | "dinheiro" | "transferencia";
    recorrente: boolean;
  }[];
  comissaoMes: number;
  recorrentes: { total: number; nomes: string[] };
};

const FORMA_PAGAMENTO_ICON: Record<string, { icon: typeof Zap; cor: string; label: string }> = {
  pix: { icon: Zap, cor: "#14B8A6", label: "Pix" },
  cartao: { icon: CreditCard, cor: "#4285F4", label: "Cartão" },
  boleto: { icon: FileText, cor: "#FF9900", label: "Boleto" },
  dinheiro: { icon: Wallet, cor: "#10B981", label: "Dinheiro" },
  transferencia: { icon: ArrowLeftRight, cor: "#8B5CF6", label: "Transferência" },
};

const AVATAR_CORES = ["#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899"];

const PERIODOS = [
  { meses: 1, label: "Último mês" },
  { meses: 3, label: "Últimos 3 meses" },
  { meses: 6, label: "Últimos 6 meses" },
] as const;

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function DashboardPage() {
  const { data: me } = useSWR<{ usuario: { nome: string } }>("/api/auth/me", fetcher);
  const primeiroNome = me?.usuario?.nome?.split(" ")[0] ?? "";
  const [periodoMeses, setPeriodoMeses] = useState<1 | 3 | 6>(6);
  const [periodoAberto, setPeriodoAberto] = useState(false);
  const periodoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!periodoAberto) return;
    function onClickFora(e: MouseEvent) {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) setPeriodoAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [periodoAberto]);

  const { data: resumo, isLoading } = useSWR<ResumoDashboard>(
    `/api/dashboard/vendas-resumo?periodo=${periodoMeses}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  const periodoLabel = PERIODOS.find((p) => p.meses === periodoMeses)?.label ?? "Últimos 6 meses";

  const receitaPorMes = resumo?.receitaPorMes ?? [];
  const mesDestaque = receitaPorMes.reduce(
    (maior, atual) => (atual.valor > maior.valor ? atual : maior),
    receitaPorMes[0]
  );
  const saldoTrend = (resumo?.saldoTrend ?? []).map((v) => ({ v }));
  const ultimasVendas = resumo?.ultimasVendas ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] font-semibold tracking-tight text-fg">
          Bem-vindo, <span className="font-normal text-fg-subtle">{primeiroNome}</span>
        </h1>
        <div className="flex items-center gap-3">
          <div ref={periodoRef} className="relative">
            <button
              onClick={() => setPeriodoAberto((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover"
            >
              <Calendar className="h-4 w-4 text-fg-subtle" />
              {periodoLabel}
              <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
            </button>
            {periodoAberto && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-48 rounded-[14px] border border-border bg-bg-elevated p-1.5 shadow-[var(--shadow-float)]">
                {PERIODOS.map((p) => (
                  <button
                    key={p.meses}
                    onClick={() => {
                      setPeriodoMeses(p.meses);
                      setPeriodoAberto(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
                  >
                    {p.label}
                    {p.meses === periodoMeses && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/vendas"
            className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Nova venda
          </Link>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.95fr_1.6fr_1fr]">
        {/* Col 1: Faturamento + receita semanal */}
        <div className="space-y-5">
          <div className={CARD}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-fg">Faturamento do Mês</h3>
                <p className="text-xs text-fg-subtle">Total recebido</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="rounded-2xl bg-[#118A61] p-5 text-white">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-sm font-semibold tracking-wide">CALINDA</span>
                <Wallet className="h-4 w-4 opacity-80" />
              </div>
              <p className="mb-1 text-[11px] text-emerald-100/80">Faturamento acumulado</p>
              <p className="mb-7 text-2xl font-bold">{isLoading ? "..." : formatarMoeda(resumo?.totalMesAtual ?? 0)}</p>
              <div className="flex items-center justify-between text-[11px] text-emerald-100/80">
                <span>Comissão do mês</span>
                <span>{formatarMoeda(resumo?.comissaoMes ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className={CARD}>
            <p className="mb-2 text-sm font-medium text-fg-muted">Receita dos Últimos 7 Dias</p>
            <span className="text-xl font-bold text-fg">
              {isLoading ? "..." : formatarMoeda(resumo?.receitaSemana ?? 0)}
            </span>
          </div>
        </div>

        {/* Col 2: Receita por mês */}
        <div className={CARD_LG}>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-fg">Receita por Mês</h3>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaPorMes} barCategoryGap="40%">
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {receitaPorMes.map((d) => (
                    <Cell key={d.mes} fill={mesDestaque && d.valor === mesDestaque.valor && d.valor > 0 ? "#15803d" : "#bbe3c8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-between text-xs text-fg-subtle">
            {receitaPorMes.map((d) => (
              <span key={d.mes}>{d.mes}</span>
            ))}
          </div>
        </div>

        {/* Col 3: Tendência dos últimos 10 dias */}
        <div className={CARD}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Vendas Recorrentes</h3>
              <p className="text-xs text-fg-subtle">Assinaturas ativas</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-fg-muted">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <p className="mb-1 text-xs text-fg-subtle">No período selecionado</p>
          <p className="mb-4 text-2xl font-bold text-fg">{resumo?.recorrentes.total ?? 0}</p>
          <div className="mb-5 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={saldoTrend}>
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#15803d" strokeWidth={2} fill="url(#balanceFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Link
            href="/vendas"
            className="flex items-center justify-center gap-1 rounded-full bg-accent px-3 py-2.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Ver todas as vendas
          </Link>
        </div>
      </div>

      {/* Row 2 */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.85fr_1fr]">
        {/* Payment history table */}
        <div className={CARD_LG}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Histórico de Pagamentos</h3>
              <p className="text-xs text-fg-subtle">Vendas recentes</p>
            </div>
            <Link
              href="/vendas"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-fg-muted hover:bg-border"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {ultimasVendas.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-subtle">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="pb-4 pr-4 font-medium">Nome</th>
                  <th className="pb-4 pr-4 font-medium">Data</th>
                  <th className="pb-4 pr-4 font-medium">Pagamento</th>
                  <th className="pb-4 pr-4 font-medium">Status</th>
                  <th className="pb-4 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.map((row) => {
                  const info = FORMA_PAGAMENTO_ICON[row.formaPagamento];
                  const Icon = info.icon;
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${info.cor}1a`, color: info.cor }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-fg">{row.nome}</p>
                            {row.recorrente && <p className="text-xs text-accent">Recorrente</p>}
                          </div>
                        </div>
                      </td>
                      <td className="pr-4 text-fg-muted">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
                          new Date(row.data)
                        )}
                      </td>
                      <td className="pr-4 text-fg-muted">{info.label}</td>
                      <td className="pr-4">
                        <span className="flex items-center gap-1.5 text-fg-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Concluído
                        </span>
                      </td>
                      <td className="text-right font-medium text-fg">{formatarMoeda(row.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Right column: comissão + recorrentes */}
        <div className="space-y-5">
          <div className={CARD}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-fg">Orçamentos</h3>
                  <p className="text-[11px] text-fg-subtle">Gerar novo orçamento</p>
                </div>
              </div>
            </div>
            <Link
              href="/orcamentos"
              className="flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
            >
              Ir para Orçamentos
            </Link>
          </div>

          <div className={CARD}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-fg">Clientes Recorrentes</h3>
                <p className="text-[11px] text-fg-subtle">Assinaturas ativas</p>
              </div>
              <Link
                href="/clientes"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-fg-muted hover:bg-border"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {resumo?.recorrentes.nomes.length ? (
              <div className="flex -space-x-2">
                {resumo.recorrentes.nomes.slice(0, 4).map((nome, i) => (
                  <div
                    key={`${nome}-${i}`}
                    title={nome}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface text-xs font-semibold text-white"
                    style={{ backgroundColor: AVATAR_CORES[i % AVATAR_CORES.length] }}
                  >
                    {iniciais(nome)}
                  </div>
                ))}
                {resumo.recorrentes.total > 4 && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-accent text-xs font-semibold text-accent-foreground">
                    +{resumo.recorrentes.total - 4}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-fg-subtle">Nenhuma venda recorrente ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
