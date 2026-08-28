"use client";

import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Save, Repeat, Wallet, Pencil, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { fetcher, apiPost, apiPatch, ApiError } from "@/lib/fetcher";
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
  const [dialogAberto, setDialogAberto] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState<Venda | null>(null);

  const vendas = data?.vendas ?? [];
  const totalMes = vendas
    .filter((v) => {
      if (v.status !== "confirmada") return false;
      const d = new Date(v.dataPagamento);
      const agora = new Date();
      return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
    })
    .reduce((s, v) => s + v.valor, 0);

  function abrirNova() {
    setVendaEmEdicao(null);
    setDialogAberto(true);
  }

  function abrirEdicao(venda: Venda) {
    setVendaEmEdicao(venda);
    setDialogAberto(true);
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        description={`${vendas.length} venda${vendas.length === 1 ? "" : "s"} registrada${vendas.length === 1 ? "" : "s"} · ${formatarMoeda(totalMes)} este mês`}
        actions={
          <Button onClick={abrirNova}>
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
              <Card key={v.id} className={`p-4 ${v.status === "rascunho" ? "border border-dashed border-accent/40" : ""}`}>
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
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-medium text-fg">
                      {formatarMoeda(v.valor)}
                      {v.quantidade > 1 && <span className="text-fg-subtle"> ×{v.quantidade}</span>}
                    </p>
                    <button
                      onClick={() => abrirEdicao(v)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {v.status === "rascunho" && <Badge color="#F59E0B">Rascunho</Badge>}
                  <Badge color="#71717a" variant="outline">
                    {FORMA_PAGAMENTO_LABEL[v.formaPagamento]}
                  </Badge>
                  {v.recorrente && (
                    <Badge color="#3B82F6">
                      <Repeat className="h-3 w-3" /> Recorrente
                    </Badge>
                  )}
                  {v.comprovantePath && (
                    <Badge color="#22C55E">
                      <FileText className="h-3 w-3" /> Comprovante
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
                  <th className="pb-4 pr-4 font-medium">Data</th>
                  <th className="pb-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-4 pr-4 font-medium text-fg">
                      <div className="flex items-center gap-2">
                        {v.status === "rascunho" && <Badge color="#F59E0B">Rascunho</Badge>}
                        {v.lead?.nome ?? <span className="text-fg-subtle">Cliente avulso</span>}
                      </div>
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
                        {v.comprovantePath && (
                          <Badge color="#22C55E">
                            <FileText className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="pr-4 text-fg-muted">
                      {v.comissaoIntegral ? "100%" : v.comissaoPercentual ? `${v.comissaoPercentual}%` : "—"}
                    </td>
                    <td className="pr-4 text-fg-muted">{format(new Date(v.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td>
                      <button
                        onClick={() => abrirEdicao(v)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}

      <VendaFormDialog
        key={vendaEmEdicao?.id ?? "nova"}
        open={dialogAberto}
        venda={vendaEmEdicao}
        onClose={() => setDialogAberto(false)}
      />
    </div>
  );
}

function VendaFormDialog({ open, venda, onClose }: { open: boolean; venda: Venda | null; onClose: () => void }) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>(open ? "/api/leads" : null, fetcher);
  const leads = leadsData?.leads ?? [];
  const editando = Boolean(venda);

  const [leadId, setLeadId] = useState(venda?.leadId ?? "");
  const [valor, setValor] = useState<number>(venda?.valor ?? 0);
  const [quantidade, setQuantidade] = useState(venda?.quantidade ?? 1);
  const [formaPagamento, setFormaPagamento] = useState<Venda["formaPagamento"]>(venda?.formaPagamento ?? "pix");
  const [recorrente, setRecorrente] = useState(venda?.recorrente ?? false);
  const [proximaCobrancaEm, setProximaCobrancaEm] = useState(venda?.proximaCobrancaEm?.slice(0, 10) ?? "");
  const [comissaoIntegral, setComissaoIntegral] = useState(venda?.comissaoIntegral ?? true);
  const [comissaoPercentual, setComissaoPercentual] = useState<number>(venda?.comissaoPercentual ?? 50);
  const [comprovantePath, setComprovantePath] = useState<string | null>(venda?.comprovantePath ?? null);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fecharSemRascunho = useRef(false);

  if (!open) return null;

  function campos(rascunho: boolean) {
    return {
      leadId: leadId || null,
      valor,
      quantidade,
      formaPagamento,
      recorrente,
      proximaCobrancaEm: recorrente && proximaCobrancaEm ? proximaCobrancaEm : null,
      comissaoIntegral,
      comissaoPercentual: !comissaoIntegral ? comissaoPercentual : null,
      comprovantePath,
      rascunho,
    };
  }

  async function enviarComprovante(file: File) {
    setEnviandoComprovante(true);
    setErro(null);
    try {
      const { signedUrl, path } = await apiPost<{ signedUrl: string; token: string; path: string }>(
        "/api/vendas/comprovante-upload",
        { nomeArquivo: file.name }
      );
      const resp = await fetch(signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!resp.ok) throw new Error("Falha ao subir o arquivo");
      setComprovantePath(path);
    } catch {
      setErro("Erro ao subir comprovante");
    } finally {
      setEnviandoComprovante(false);
    }
  }

  // Fechar sem salvar explicitamente (X, Esc, clique fora) — se já tem algo
  // preenchido numa venda nova, guarda como rascunho em vez de perder tudo.
  async function handleClose() {
    if (!fecharSemRascunho.current && !editando && (valor > 0 || leadId || comprovantePath)) {
      try {
        await apiPost("/api/vendas", campos(true));
        mutate("/api/vendas");
      } catch {
        // silencioso — melhor perder o rascunho do que travar o fechamento
      }
    }
    fecharSemRascunho.current = false;
    onClose();
  }

  function cancelar() {
    fecharSemRascunho.current = true;
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title={editando ? "Editar venda" : "Nova venda"} maxWidth="max-w-lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErro(null);
          setSalvando(true);
          try {
            if (editando && venda) {
              await apiPatch(`/api/vendas/${venda.id}`, campos(false));
            } else {
              await apiPost("/api/vendas", campos(false));
            }
            mutate("/api/vendas");
            mutate("/api/dashboard/vendas-resumo");
            fecharSemRascunho.current = true;
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Comprovante de pagamento (opcional)</label>
          {comprovantePath ? (
            <div className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 text-sm text-fg-muted">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Comprovante anexado
              </span>
              <button type="button" onClick={() => setComprovantePath(null)} className="text-xs text-danger">
                Remover
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border px-3 py-3 text-sm text-fg-muted hover:bg-surface-hover">
              {enviandoComprovante ? "Enviando..." : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Anexar comprovante
                </>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={enviandoComprovante}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) enviarComprovante(file);
                }}
              />
            </label>
          )}
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={cancelar}>
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
