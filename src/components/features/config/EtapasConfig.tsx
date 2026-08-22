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
import type { Etapa } from "@/types";

const CORES_SUGERIDAS = ["#F87171", "#FB923C", "#FBBF24", "#34D399", "#22D3EE", "#818CF8", "#A78BFA", "#F472B6"];

export function EtapasConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const [editando, setEditando] = useState<Etapa | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const etapas = data?.etapas ?? [];

  async function remover(id: string) {
    if (!confirm("Remover esta etapa? Só é possível se não houver leads nela.")) return;
    try {
      await apiDelete(`/api/etapas/${id}`);
      mutate("/api/etapas");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao remover etapa");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          Etapas do funil, na ordem em que os leads avançam. A IA usa o campo &quot;Objetivo&quot; para decidir a
          condução da conversa nessa etapa.
        </p>
        {podeEditar && (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="h-3.5 w-3.5" /> Nova etapa
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {etapas.map((etapa) => (
          <Card key={etapa.id} accentColor={etapa.cor} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-medium text-fg">{etapa.nome}</p>
                <Badge color={etapa.cor}>ordem {etapa.ordem}</Badge>
                <Badge color="#71717a" variant="outline">
                  {etapa.tipo}
                </Badge>
                {etapa.handoffHumano && <Badge color="#3B82F6">handoff humano</Badge>}
              </div>
              {etapa.descricaoObjetivo && (
                <p className="mt-1 truncate text-xs text-fg-subtle">{etapa.descricaoObjetivo}</p>
              )}
            </div>
            {podeEditar && (
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setEditando(etapa)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remover(etapa.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <EtapaFormDialog
        open={criando}
        onClose={() => setCriando(false)}
        onSalvar={async (dados) => {
          setErro(null);
          try {
            await apiPost("/api/etapas", dados);
            mutate("/api/etapas");
            setCriando(false);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao criar etapa");
          }
        }}
        erro={erro}
      />

      <EtapaFormDialog
        open={!!editando}
        etapa={editando ?? undefined}
        onClose={() => setEditando(null)}
        onSalvar={async (dados) => {
          if (!editando) return;
          setErro(null);
          try {
            await apiPatch(`/api/etapas/${editando.id}`, dados);
            mutate("/api/etapas");
            setEditando(null);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao salvar etapa");
          }
        }}
        erro={erro}
      />
    </div>
  );
}

function EtapaFormDialog({
  open,
  etapa,
  onClose,
  onSalvar,
  erro,
}: {
  open: boolean;
  etapa?: Etapa;
  onClose: () => void;
  onSalvar: (dados: Partial<Etapa>) => void;
  erro: string | null;
}) {
  const [nome, setNome] = useState(etapa?.nome ?? "");
  const [ordem, setOrdem] = useState(etapa?.ordem ?? 1);
  const [cor, setCor] = useState(etapa?.cor ?? CORES_SUGERIDAS[0]);
  const [tipo, setTipo] = useState(etapa?.tipo ?? "funil");
  const [handoffHumano, setHandoffHumano] = useState(etapa?.handoffHumano ?? false);
  const [descricaoObjetivo, setDescricaoObjetivo] = useState(etapa?.descricaoObjetivo ?? "");

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title={etapa ? "Editar etapa" : "Nova etapa"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar({ nome, ordem: Number(ordem), cor, tipo: tipo as Etapa["tipo"], handoffHumano, descricaoObjetivo });
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome</label>
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Ordem</label>
            <Input type="number" value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Tipo</label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as Etapa["tipo"])}>
              <option value="funil">Funil</option>
              <option value="remarketing">Remarketing</option>
              <option value="cliente">Cliente</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES_SUGERIDAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow"
                style={{ backgroundColor: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">
            Objetivo da IA nessa etapa
          </label>
          <Textarea
            rows={2}
            value={descricaoObjetivo}
            onChange={(e) => setDescricaoObjetivo(e.target.value)}
            placeholder="Ex.: Validar orçamento e propor reunião com o consultor."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={handoffHumano} onChange={(e) => setHandoffHumano(e.target.checked)} />
          Ao entrar nesta etapa, pausar a IA e notificar o vendedor (handoff)
        </label>
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
