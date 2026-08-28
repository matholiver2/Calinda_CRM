"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Plus, Building2, Users, ArrowRight, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost, apiDelete, ApiError } from "@/lib/fetcher";

type Empresa = {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
  _count: { usuarios: number; leads: number };
};

export default function EmpresasPage() {
  const { data, error: erroListagem } = useSWR<{ empresas: Empresa[] }>("/api/empresas", fetcher);
  const [criando, setCriando] = useState(false);
  const [entrandoId, setEntrandoId] = useState<string | null>(null);
  const [erroEntrar, setErroEntrar] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Empresa | null>(null);
  const router = useRouter();

  const empresas = data?.empresas ?? [];

  async function entrar(id: string) {
    setErroEntrar(null);
    setEntrandoId(id);
    try {
      await apiPost(`/api/empresas/${id}/entrar`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErroEntrar(
        err instanceof ApiError
          ? err.message
          : "Não foi possível entrar na empresa. Confira se o banco de dados está acessível."
      );
    } finally {
      setEntrandoId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Todas as empresas cadastradas na plataforma CALINDA"
        actions={
          <Button onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" /> Nova empresa
          </Button>
        }
      />

      {erroListagem && (
        <p className="mb-4 text-sm text-danger">
          Não foi possível carregar as empresas. Confira se o banco de dados está acessível.
        </p>
      )}
      {erroEntrar && <p className="mb-4 text-sm text-danger">{erroEntrar}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {empresas.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge color={e.ativo ? "#10B981" : "#71717a"}>{e.ativo ? "Ativa" : "Inativa"}</Badge>
            </div>
            <h3 className="text-base font-semibold text-fg">{e.nome}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
              <Users className="h-3 w-3" /> {e._count.usuarios} usuários · {e._count.leads} leads
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                loading={entrandoId === e.id}
                onClick={() => entrar(e.id)}
              >
                Entrar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="danger" size="sm" onClick={() => setExcluindo(e)} title="Excluir empresa">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
        {empresas.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-fg-subtle">Nenhuma empresa cadastrada ainda.</p>
        )}
      </div>

      <NovaEmpresaDialog open={criando} onClose={() => setCriando(false)} />
      <ExcluirEmpresaDialog empresa={excluindo} onClose={() => setExcluindo(null)} />
    </div>
  );
}

function NovaEmpresaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fechar() {
    setNome("");
    setErro(null);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await apiPost("/api/empresas", { nome });
      mutate("/api/empresas");
      fechar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={fechar} title="Nova empresa">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome da empresa</label>
          <Input required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nome da empresa" />
        </div>
        <p className="text-xs text-fg-subtle">
          Uma etapa inicial de funil (&quot;Novo Lead&quot;) é criada automaticamente. Depois, entre na empresa e convide os
          primeiros usuários em Configurações → Usuários.
        </p>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="h-3.5 w-3.5" /> Criar empresa
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ExcluirEmpresaDialog({ empresa, onClose }: { empresa: Empresa | null; onClose: () => void }) {
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fechar() {
    setConfirmacao("");
    setErro(null);
    onClose();
  }

  if (!empresa) return null;

  async function excluir(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa) return;
    setErro(null);
    setLoading(true);
    try {
      await apiDelete(`/api/empresas/${empresa.id}`, { confirmarNome: confirmacao });
      mutate("/api/empresas");
      fechar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao excluir empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={Boolean(empresa)} onClose={fechar} title="Excluir empresa">
      <form onSubmit={excluir} className="space-y-4">
        <p className="text-sm text-fg-muted">
          Isso apaga <strong className="text-fg">{empresa.nome}</strong> permanentemente: todos os usuários e acessos,
          leads, conversas, reuniões, vendas, orçamentos e arquivos. Não pode ser desfeito.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">
            Digite <strong className="text-fg">{empresa.nome}</strong> para confirmar
          </label>
          <Input autoFocus value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={loading} disabled={confirmacao !== empresa.nome}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir tudo
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
