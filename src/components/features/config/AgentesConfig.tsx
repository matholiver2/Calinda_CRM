"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save, Bot, Lightbulb, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import type { AgenteIa, Etapa } from "@/types";

export function AgentesConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data } = useSWR<{ agentes: AgenteIa[] }>("/api/agentes-ia", fetcher);
  const { data: etapasData } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const [editando, setEditando] = useState<AgenteIa | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [ajudaAberta, setAjudaAberta] = useState(false);

  const agentes = data?.agentes ?? [];
  const etapas = etapasData?.etapas ?? [];

  async function remover(id: string) {
    if (!confirm("Remover este agente de IA?")) return;
    await apiDelete(`/api/agentes-ia/${id}`);
    mutate("/api/agentes-ia");
  }

  async function alternarAtivo(agente: AgenteIa) {
    await apiPatch(`/api/agentes-ia/${agente.id}`, { ativo: !agente.ativo });
    mutate("/api/agentes-ia");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          Cada agente define a persona e o objetivo da IA para uma etapa específica do funil.
        </p>
        {podeEditar && (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo agente
          </Button>
        )}
      </div>

      <Card className="mb-4 p-0 overflow-hidden">
        <button
          onClick={() => setAjudaAberta((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Lightbulb className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-fg">Como criar um agente (ex: detectar pedido de reunião)</p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-fg-subtle transition-transform ${ajudaAberta ? "rotate-180" : ""}`} />
        </button>
        {ajudaAberta && (
          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 text-sm text-fg-muted">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Escolha a <span className="font-medium text-fg">etapa</span> do funil onde o cliente costuma pedir
                reunião (ex: uma etapa mais avançada, tipo &quot;Qualificando&quot; ou &quot;Fechamento&quot;).
              </li>
              <li>
                Clique em <span className="font-medium text-fg">&quot;Novo agente&quot;</span> e preencha a{" "}
                <span className="font-medium text-fg">Persona</span> (quem é o agente/empresa).
              </li>
              <li>
                No campo <span className="font-medium text-fg">Objetivo</span>, escreva a instrução — é o campo mais
                importante, esse texto vai direto no prompt que a IA recebe.
              </li>
            </ol>
            <div className="rounded-lg border border-border bg-bg-elevated p-3">
              <p className="mb-1 text-xs font-medium text-fg">Exemplo de Objetivo para detectar pedido de reunião:</p>
              <p className="text-xs italic text-fg-subtle">
                &quot;Identificar quando o lead demonstra intenção de marcar uma reunião (frases como &apos;pode
                ser&apos;, &apos;vamos marcar&apos;, &apos;topo&apos;, menção de dia/horário, ou pedido direto).
                Quando isso acontecer, confirmar o interesse e sinalizar que a reunião deve ser agendada.&quot;
              </p>
            </div>
            <p className="text-xs text-fg-subtle">
              Você não precisa criar lógica nenhuma — a cada mensagem, a IA já decide sozinha se deve sugerir
              reunião e já cria o agendamento automaticamente quando isso acontece. O Objetivo só deixa essa decisão
              mais precisa, com a linguagem e o critério do seu negócio.
            </p>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {agentes.map((agente) => (
          <Card key={agente.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-fg">{agente.nome}</p>
                    <Badge color={agente.etapa.cor}>{agente.etapa.nome}</Badge>
                    {!agente.ativo && <Badge color="#71717a">inativo</Badge>}
                    <Badge color="#71717a" variant="outline">
                      {agente.modeloLlm}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-fg-subtle">
                    <span className="font-medium text-fg-muted">Objetivo:</span> {agente.objetivo}
                  </p>
                </div>
              </div>
              {podeEditar && (
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => alternarAtivo(agente)}>
                    {agente.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditando(agente)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remover(agente.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {agentes.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-subtle">Nenhum agente de IA configurado.</p>
        )}
      </div>

      <AgenteFormDialog
        key={criando ? "criando-aberto" : "criando-fechado"}
        open={criando}
        etapas={etapas}
        onClose={() => setCriando(false)}
        erro={erro}
        onSalvar={async (dados) => {
          setErro(null);
          try {
            await apiPost("/api/agentes-ia", dados);
            mutate("/api/agentes-ia");
            setCriando(false);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao criar agente");
          }
        }}
      />

      <AgenteFormDialog
        key={editando?.id ?? "editando-vazio"}
        open={!!editando}
        agente={editando ?? undefined}
        etapas={etapas}
        onClose={() => setEditando(null)}
        erro={erro}
        onSalvar={async (dados) => {
          if (!editando) return;
          setErro(null);
          try {
            await apiPatch(`/api/agentes-ia/${editando.id}`, dados);
            mutate("/api/agentes-ia");
            setEditando(null);
          } catch (err) {
            setErro(err instanceof ApiError ? err.message : "Erro ao salvar agente");
          }
        }}
      />
    </div>
  );
}

function AgenteFormDialog({
  open,
  agente,
  etapas,
  onClose,
  onSalvar,
  erro,
}: {
  open: boolean;
  agente?: AgenteIa;
  etapas: Etapa[];
  onClose: () => void;
  onSalvar: (dados: Record<string, unknown>) => void;
  erro: string | null;
}) {
  const [nome, setNome] = useState(agente?.nome ?? "");
  const [etapaId, setEtapaId] = useState(agente?.etapaId ?? etapas[0]?.id ?? "");
  const [persona, setPersona] = useState(agente?.persona ?? "");
  const [objetivo, setObjetivo] = useState(agente?.objetivo ?? "");

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title={agente ? "Editar agente de IA" : "Novo agente de IA"} maxWidth="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar({ nome, etapaId, persona, objetivo, modeloLlm: "gemini-3.6-flash" });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome do agente</label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Etapa</label>
            <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Persona (quem é o agente e a empresa)</label>
          <Textarea
            required
            rows={3}
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Ex.: Você é a Cali, assistente virtual da CALINDA..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Objetivo nesta etapa</label>
          <Textarea
            required
            rows={2}
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="O que a IA deve alcançar antes de avançar o lead"
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
