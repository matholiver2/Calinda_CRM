"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Save, Repeat, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Venda, Lead } from "@/types";

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

const FORMA_PAGAMENTO_LABEL: Record<Venda["formaPagamento"], string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

export default function VendasPage() {
  const { data } = useSWR<{ vendas: Venda[] }>("/api/vendas", fetcher, { refreshInterval: 15000 });
  const [criando, setCriando] = useState(false);

  const vendas = data?.vendas ?? [];
  const totalMes = vendas
    .filter((v) => {
      const d = new Date(v.dataPagamento);
      const agora = new Date();
      return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
    })
    .reduce((s, v) => s + v.valor, 0);

  return (
    <div>
      <PageHeader
        title="Vendas"
        description={`${vendas.length} venda${vendas.length === 1 ? "" : "s"} registrada${vendas.length === 1 ? "" : "s"} · ${formatarMoeda(totalMes)} este mês`}
        actions={
          <Button onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" /> Nova venda
          </Button>
        }
      />

      {vendas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
            <Wallet className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-fg">Nenhuma venda registrada</p>
          <p className="max-w-sm text-sm text-fg-subtle">
            Lance as vendas que fecharam pra acompanhar receita e comissão — isso também alimenta o Dashboard.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile: cards empilhados, sem scroll horizontal */}
          <div className="space-y-2.5 sm:hidden">
            {vendas.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{v.lead?.nome ?? "Cliente avulso"}</p>
                    {v.vendedor && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Avatar nome={v.vendedor.nome} cor={v.vendedor.avatarCor} size="sm" />
                        <span className="text-xs text-fg-subtle">{v.vendedor.nome}</span>
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 font-medium text-fg">
                    {formatarMoeda(v.valor)}
                    {v.quantidade > 1 && <span className="text-fg-subtle"> ×{v.quantidade}</span>}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge color="#71717a" variant="outline">
                    {FORMA_PAGAMENTO_LABEL[v.formaPagamento]}
                  </Badge>
                  {v.recorrente && (
                    <Badge color="#3B82F6">
                      <Repeat className="h-3 w-3" /> Recorrente
                    </Badge>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-fg-subtle">
                  <span>Comissão: {v.comissaoIntegral ? "100%" : v.comissaoPercentual ? `${v.comissaoPercentual}%` : "—"}</span>
                  <span>{format(new Date(v.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop/tablet: tabela */}
          <Card className="hidden overflow-hidden p-7 sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-subtle">
                  <th className="pb-4 pr-4 font-medium">Cliente</th>
                  <th className="pb-4 pr-4 font-medium">Vendedor</th>
                  <th className="pb-4 pr-4 font-medium">Valor</th>
                  <th className="pb-4 pr-4 font-medium">Pagamento</th>
                  <th className="pb-4 pr-4 font-medium">Comissão</th>
                  <th className="pb-4 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-4 pr-4 font-medium text-fg">
                      {v.lead?.nome ?? <span className="text-fg-subtle">Cliente avulso</span>}
                    </td>
                    <td className="pr-4">
                      {v.vendedor ? (
                        <div className="flex items-center gap-2">
                          <Avatar nome={v.vendedor.nome} cor={v.vendedor.avatarCor} size="sm" />
                          <span className="text-fg-muted">{v.vendedor.nome}</span>
                        </div>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                    <td className="pr-4 font-medium text-fg">
                      {formatarMoeda(v.valor)}
                      {v.quantidade > 1 && <span className="text-fg-subtle"> ×{v.quantidade}</span>}
                    </td>
                    <td className="pr-4">
                      <div className="flex items-center gap-1.5">
                        <Badge color="#71717a" variant="outline">
                          {FORMA_PAGAMENTO_LABEL[v.formaPagamento]}
                        </Badge>
                        {v.recorrente && (
                          <Badge color="#3B82F6">
                            <Repeat className="h-3 w-3" /> Recorrente
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="pr-4 text-fg-muted">
                      {v.comissaoIntegral ? "100%" : v.comissaoPercentual ? `${v.comissaoPercentual}%` : "—"}
                    </td>
                    <td className="text-fg-muted">{format(new Date(v.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}

      <NovaVendaDialog open={criando} onClose={() => setCriando(false)} />
    </div>
  );
}

function NovaVendaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>(open ? "/api/leads" : null, fetcher);
  const leads = leadsData?.leads ?? [];

  const [leadId, setLeadId] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [quantidade, setQuantidade] = useState(1);
  const [formaPagamento, setFormaPagamento] = useState<Venda["formaPagamento"]>("pix");
  const [recorrente, setRecorrente] = useState(false);
  const [proximaCobrancaEm, setProximaCobrancaEm] = useState("");
  const [comissaoIntegral, setComissaoIntegral] = useState(true);
  const [comissaoPercentual, setComissaoPercentual] = useState<number>(50);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Nova venda" maxWidth="max-w-lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setSalvando(true);
          try {
            await apiPost("/api/vendas", {
              leadId: leadId || null,
              valor,
              quantidade,
              formaPagamento,
              recorrente,
              proximaCobrancaEm: recorrente && proximaCobrancaEm ? proximaCobrancaEm : null,
              comissaoIntegral,
              comissaoPercentual: !comissaoIntegral ? comissaoPercentual : null,
            });
            mutate("/api/vendas");
            mutate("/api/dashboard/vendas-resumo");
            onClose();
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao registrar venda");
          } finally {
            setSalvando(false);
          }
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cliente (opcional)</label>
          <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Cliente avulso</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Valor (R$)</label>
            <Input required type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Quantidade</label>
            <Input required type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Forma de pagamento</label>
          <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as Venda["formaPagamento"])}>
            <option value="pix">Pix</option>
            <option value="cartao">Cartão</option>
            <option value="boleto">Boleto</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
          Pagamento recorrente (assinatura)
        </label>
        {recorrente && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Próxima cobrança em</label>
            <Input type="date" value={proximaCobrancaEm} onChange={(e) => setProximaCobrancaEm(e.target.value)} />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Comissão</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setComissaoIntegral(true)}
              className={`flex-1 rounded-[10px] border px-3 py-2 text-sm transition-colors ${
                comissaoIntegral ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
              }`}
            >
              100% (tudo meu)
            </button>
            <button
              type="button"
              onClick={() => setComissaoIntegral(false)}
              className={`flex-1 rounded-[10px] border px-3 py-2 text-sm transition-colors ${
                !comissaoIntegral ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
              }`}
            >
              Percentual
            </button>
          </div>
          {!comissaoIntegral && (
            <Input
              className="mt-2"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={comissaoPercentual}
              onChange={(e) => setComissaoPercentual(Number(e.target.value))}
              placeholder="% de comissão"
            />
          )}
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvando}>
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
