"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Search, MessageCircle, FileText, Users, Plus, Tag, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { fetcher, apiPost, apiPatch, ApiError } from "@/lib/fetcher";
import { formatarTelefone } from "@/lib/utils";
import type { Lead, GrupoCliente } from "@/types";

const CORES_GRUPO = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"];

export default function ClientesPage() {
  const { data, mutate: mutateLeads } = useSWR<{ leads: Lead[] }>("/api/leads?status=cliente", fetcher, {
    refreshInterval: 15000,
  });
  const { data: gruposData } = useSWR<{ grupos: GrupoCliente[] }>("/api/grupos-cliente", fetcher);
  const [busca, setBusca] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const [criandoGrupo, setCriandoGrupo] = useState(false);

  const grupos = gruposData?.grupos ?? [];

  const clientes = useMemo(() => {
    const todos = data?.leads ?? [];
    return todos
      .filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()))
      .filter((c) => {
        if (!grupoFiltro) return true;
        if (grupoFiltro === "nenhum") return !c.grupoId;
        return c.grupoId === grupoFiltro;
      });
  }, [data, busca, grupoFiltro]);

  async function alterarGrupo(clienteId: string, grupoId: string) {
    await apiPatch(`/api/leads/${clienteId}`, { grupoId: grupoId || null });
    mutateLeads();
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"} na carteira`}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setCriandoGrupo(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo grupo
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome"
            className="pl-10"
          />
        </div>
        <div className="w-[200px] shrink-0">
          <Select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}>
            <option value="">Todos os grupos</option>
            <option value="nenhum">Sem grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome} ({g._count?.leads ?? 0})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {clientes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-fg">Nenhum cliente ainda</p>
          <p className="max-w-sm text-sm text-fg-subtle">
            Quando um lead fechar (reunião marcada como &quot;fechou&quot;, ou marcado manualmente como cliente na
            página dele), ele aparece aqui.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile: cards empilhados, sem scroll horizontal */}
          <div className="space-y-2.5 sm:hidden">
            {clientes.map((cliente) => (
              <Card key={cliente.id} className="p-4" accentColor={cliente.grupo?.cor}>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/leads/${cliente.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar nome={cliente.nome} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{cliente.nome}</p>
                      <p className="font-mono text-xs text-fg-subtle">{formatarTelefone(cliente.telefone)}</p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href="/conversas"
                      title="Conversar via WhatsApp"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/orcamentos?leadId=${cliente.id}`}
                      title="Criar orçamento"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent"
                    >
                      <FileText className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  <span>{cliente.email ?? "Sem e-mail"}</span>
                  <span>{cliente.vendedor ? cliente.vendedor.nome : "Sem vendedor"}</span>
                </div>
                <div className="mt-2.5">
                  <Select
                    className="!py-1.5 !text-xs"
                    value={cliente.grupoId ?? ""}
                    onChange={(e) => alterarGrupo(cliente.id, e.target.value)}
                  >
                    <option value="">Sem grupo</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                      </option>
                    ))}
                  </Select>
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
                  <th className="pb-4 pr-4 font-medium">E-mail</th>
                  <th className="pb-4 pr-4 font-medium">Vendedor</th>
                  <th className="pb-4 pr-4 font-medium">Grupo</th>
                  <th className="pb-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-border">
                    <td className="py-4 pr-4">
                      <Link href={`/leads/${cliente.id}`} className="flex items-center gap-3">
                        {cliente.grupo && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cliente.grupo.cor }}
                            title={cliente.grupo.nome}
                          />
                        )}
                        <Avatar nome={cliente.nome} size="sm" />
                        <div>
                          <p className="font-medium text-fg">{cliente.nome}</p>
                          <p className="font-mono text-xs text-fg-subtle">{formatarTelefone(cliente.telefone)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="pr-4 text-fg-muted">{cliente.email ?? <span className="text-fg-subtle">—</span>}</td>
                    <td className="pr-4 text-fg-muted">
                      {cliente.vendedor ? cliente.vendedor.nome : <span className="text-fg-subtle">—</span>}
                    </td>
                    <td className="pr-4">
                      <Select
                        className="!w-auto !py-1.5 !text-xs"
                        value={cliente.grupoId ?? ""}
                        onChange={(e) => alterarGrupo(cliente.id, e.target.value)}
                      >
                        <option value="">Sem grupo</option>
                        {grupos.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nome}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href="/conversas"
                          title="Conversar via WhatsApp"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/orcamentos?leadId=${cliente.id}`}
                          title="Criar orçamento"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-accent-soft hover:text-accent"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}

      {grupos.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-fg-subtle">
            <Tag className="h-3.5 w-3.5" /> Grupos:
          </span>
          {grupos.map((g) => (
            <Badge key={g.id} color={g.cor}>
              {g.nome} · {g._count?.leads ?? 0}
            </Badge>
          ))}
        </div>
      )}

      <NovoGrupoDialog open={criandoGrupo} onClose={() => setCriandoGrupo(false)} />
    </div>
  );
}

function NovoGrupoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState(CORES_GRUPO[0]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setNome("");
    setDescricao("");
    setCor(CORES_GRUPO[0]);
    setErro(null);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await apiPost("/api/grupos-cliente", { nome, descricao, cor });
      mutate("/api/grupos-cliente");
      fechar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar grupo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={fechar} title="Novo grupo de clientes">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome</label>
          <Input required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: VIP" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Descrição (opcional)</label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Clientes com plano anual" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cor</label>
          <div className="flex flex-wrap gap-2">
            {CORES_GRUPO.map((c) => (
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
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="h-3.5 w-3.5" /> Criar grupo
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
