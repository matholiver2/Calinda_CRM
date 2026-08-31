"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import type { Plano } from "@/types";

const PERIODICIDADE_LABEL: Record<Plano["periodicidade"], string> = {
  mensal: "por mês",
  anual: "por ano",
  unico: "pagamento único",
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function PlanosConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data } = useSWR<{ planos: Plano[] }>("/api/planos", fetcher);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const planos = data?.planos ?? [];

  async function remover(id: string) {
    if (!confirm("Remover este plano? Só é possível se não houver orçamentos vinculados.")) return;
    try {
      await apiDelete(`/api/planos/${id}`);
      mutate("/api/planos");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao remover plano");
    }
  }

  async function alternarAtivo(plano: Plano) {
    await apiPatch(`/api/planos/${plano.id}`, { ativo: !plano.ativo });
    mutate("/api/planos");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">Planos usados nos orçamentos enviados aos clientes.</p>
        {podeEditar && (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo plano
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {planos.map((plano) => (
          <Card key={plano.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-fg">{plano.nome}</p>
                <Badge color="#217940">
                  {formatarMoeda(plano.valor)} {PERIODICIDADE_LABEL[plano.periodicidade]}
                </Badge>
                {!plano.ativo && <Badge color="#71717a">inativo</Badge>}
              </div>
              {plano.descricao && <p className="mt-1 truncate text-xs text-fg-subtle">{plano.descricao}</p>}
            </div>
            {podeEditar && (
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => alternarAtivo(plano)}>
                  {plano.ativo ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditando(plano)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remover(plano.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            )}
          </Card>
        ))}
        {planos.length === 0 && <p className="py-10 text-center text-sm text-fg-subtle">Nenhum plano cadastrado.</p>}
      </div>

      <PlanoFormDialog
        key={criando ? "criando-aberto" : "criando-fechado"}
        open={criando}
        onClose={() => setCriando(false)}
        erro={erro}
        onSalvar={async (dados) => {
          setErro(null);
          try {
            await apiPost("/api/planos", dados);
            mutate("/api/planos");
            setCriando(false);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao criar plano");
          }
        }}
      />

      <PlanoFormDialog
        key={editando?.id ?? "editando-vazio"}
        open={!!editando}
        plano={editando ?? undefined}
        onClose={() => setEditando(null)}
        erro={erro}
        onSalvar={async (dados) => {
          if (!editando) return;
          setErro(null);
          try {
            await apiPatch(`/api/planos/${editando.id}`, dados);
            mutate("/api/planos");
            setEditando(null);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao salvar plano");
          }
        }}
      />
    </div>
  );
}

function PlanoFormDialog({
  open,
  plano,
  onClose,
  onSalvar,
  erro,
}: {
  open: boolean;
  plano?: Plano;
  onClose: () => void;
  onSalvar: (dados: Record<string, unknown>) => void;
  erro: string | null;
}) {
  const [nome, setNome] = useState(plano?.nome ?? "");
  const [descricao, setDescricao] = useState(plano?.descricao ?? "");
  const [valor, setValor] = useState(plano?.valor ?? 0);
  const [periodicidade, setPeriodicidade] = useState<Plano["periodicidade"]>(plano?.periodicidade ?? "mensal");

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title={plano ? "Editar plano" : "Novo plano"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar({ nome, descricao, valor: Number(valor), periodicidade });
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome</label>
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Plano Essencial" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Valor (R$)</label>
            <Input
              required
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Periodicidade</label>
            <Select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Plano["periodicidade"])}>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
              <option value="unico">Pagamento único</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Descrição</label>
          <Textarea
            rows={2}
            value={descricao ?? ""}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que está incluso nesse plano"
          />
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
