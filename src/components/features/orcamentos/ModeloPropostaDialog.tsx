"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";

type Deliverable = { id: string; titulo: string; desc: string; valor: number; bonus?: boolean };
type ModeloProposta = {
  diagnostico: string;
  deliverables: Deliverable[];
  garantia: string;
  urgencia: string;
  fechamento: string;
  corDestaque: string;
  validadeDias: number;
};

export function ModeloPropostaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, mutate } = useSWR<{ modelo: ModeloProposta }>(open ? "/api/configuracoes/proposta" : null, fetcher);
  return (
    <Dialog open={open} onClose={onClose} title="Modelo de proposta comercial" maxWidth="max-w-2xl">
      {open && data && (
        <Formulario
          inicial={data.modelo}
          onSalvo={() => {
            mutate();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function Formulario({ inicial, onSalvo }: { inicial: ModeloProposta; onSalvo: () => void }) {
  const [diagnostico, setDiagnostico] = useState(inicial.diagnostico);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(inicial.deliverables);
  const [garantia, setGarantia] = useState(inicial.garantia);
  const [urgencia, setUrgencia] = useState(inicial.urgencia);
  const [fechamento, setFechamento] = useState(inicial.fechamento);
  const [corDestaque, setCorDestaque] = useState(inicial.corDestaque);
  const [validadeDias, setValidadeDias] = useState(inicial.validadeDias);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function addDeliverable() {
    setDeliverables((d) => [...d, { id: `d-${Date.now()}`, titulo: "", desc: "", valor: 0 }]);
  }
  function atualizarDeliverable(id: string, patch: Partial<Deliverable>) {
    setDeliverables((d) => d.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removerDeliverable(id: string) {
    setDeliverables((d) => d.filter((it) => it.id !== id));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiPatch("/api/configuracoes/proposta", {
        diagnostico,
        deliverables: deliverables.filter((d) => d.titulo.trim()),
        garantia,
        urgencia,
        fechamento,
        corDestaque,
        validadeDias,
      });
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-fg-subtle">
        Esse modelo é usado em todo PDF de &quot;Proposta comercial&quot; gerado a partir de um orçamento — os dados do
        cliente e o valor vêm automaticamente do orçamento, só o conteúdo persuasivo abaixo é compartilhado entre todas as propostas.
      </p>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Diagnóstico (o que está sendo resolvido)</label>
        <Textarea rows={3} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Hoje a situação é... Isso custa..." />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-fg-muted">O que está incluso (value stack)</label>
          <Button type="button" variant="secondary" size="sm" onClick={addDeliverable}>
            <Plus className="h-3.5 w-3.5" /> Item
          </Button>
        </div>
        <div className="space-y-2">
          {deliverables.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5">
              <Input className="min-w-[140px] flex-1" value={d.titulo} onChange={(e) => atualizarDeliverable(d.id, { titulo: e.target.value })} placeholder="Título" />
              <Input className="min-w-[140px] flex-1" value={d.desc} onChange={(e) => atualizarDeliverable(d.id, { desc: e.target.value })} placeholder="Descrição curta" />
              <Input
                className="w-28"
                type="number"
                value={d.valor}
                onChange={(e) => atualizarDeliverable(d.id, { valor: Number(e.target.value) })}
                placeholder="Valor"
              />
              <label className="flex items-center gap-1 text-xs text-fg-muted">
                <input type="checkbox" checked={Boolean(d.bonus)} onChange={(e) => atualizarDeliverable(d.id, { bonus: e.target.checked })} />
                Bônus
              </label>
              <button type="button" onClick={() => removerDeliverable(d.id)} className="text-fg-subtle hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {deliverables.length === 0 && <p className="text-xs text-fg-subtle">Nenhum item ainda.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Garantia</label>
          <Textarea rows={2} value={garantia} onChange={(e) => setGarantia(e.target.value)} placeholder="Ex: 7 dias de garantia incondicional" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Urgência</label>
          <Textarea rows={2} value={urgencia} onChange={(e) => setUrgencia(e.target.value)} placeholder="Ex: vagas limitadas por mês" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Mensagem de fechamento</label>
        <Textarea rows={2} value={fechamento} onChange={(e) => setFechamento(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cor de destaque</label>
          <input type="color" value={corDestaque} onChange={(e) => setCorDestaque(e.target.value)} className="h-10 w-full rounded-lg border border-border" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Validade (dias)</label>
          <Input type="number" min={1} value={validadeDias} onChange={(e) => setValidadeDias(Number(e.target.value))} />
        </div>
      </div>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="flex justify-end">
        <Button onClick={salvar} loading={salvando}>
          Salvar modelo
        </Button>
      </div>
    </div>
  );
}
