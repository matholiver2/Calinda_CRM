"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Save, Copy, Check, X, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Avatar } from "@/components/ui/Avatar";
import { fetcher, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import { papelLabel } from "@/lib/utils";
import type { Usuario } from "@/types";

const PAPEL_COR: Record<string, string> = { admin: "#DC2626", gestor: "#3B82F6", vendedor: "#10B981" };

type Convite = {
  id: string;
  email: string;
  papel: string;
  status: "pendente" | "aceito" | "expirado" | "revogado";
  token: string;
  criadoEm: string;
  convidadoPor: { nome: string } | null;
};

export function UsuariosConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data } = useSWR<{ usuarios: Usuario[] }>("/api/usuarios", fetcher);
  const { data: convitesData } = useSWR<{ convites: Convite[] }>("/api/convites", fetcher);
  const [convidando, setConvidando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  const usuarios = data?.usuarios ?? [];
  const convitesPendentes = (convitesData?.convites ?? []).filter((c) => c.status === "pendente");

  async function alternarAtivo(u: Usuario) {
    await apiPatch(`/api/usuarios/${u.id}`, { ativo: !u.ativo });
    mutate("/api/usuarios");
  }

  async function revogar(id: string) {
    if (!confirm("Revogar este convite?")) return;
    await apiDelete(`/api/convites/${id}`);
    mutate("/api/convites");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          Acesso ao sistema é somente por convite. Convide pelo e-mail e defina o papel (admin, gestor ou
          vendedor) — a pessoa entra com esse e-mail (senha própria ou Google).
        </p>
        {podeEditar && (
          <Button size="sm" onClick={() => setConvidando(true)}>
            <Plus className="h-3.5 w-3.5" /> Convidar usuário
          </Button>
        )}
      </div>

      <Card className="mb-4 divide-y divide-border overflow-hidden p-0">
        {usuarios.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar nome={u.nome} cor={u.avatarCor} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{u.nome}</p>
                <p className="truncate text-xs text-fg-subtle">{u.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Badge color={PAPEL_COR[u.papel]}>{papelLabel(u.papel)}</Badge>
              <Badge color={u.ativo ? "#10B981" : "#71717a"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
              {podeEditar && (
                <Button variant="secondary" size="sm" onClick={() => alternarAtivo(u)}>
                  {u.ativo ? "Desativar" : "Ativar"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {convitesPendentes.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Mail className="h-4 w-4" /> Convites pendentes
          </h3>
          <div className="space-y-2">
            {convitesPendentes.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                <div>
                  <p className="font-medium text-fg">{c.email}</p>
                  <p className="text-xs text-fg-subtle">
                    {papelLabel(c.papel)} · convidado por {c.convidadoPor?.nome ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyLinkButton token={c.token} />
                  {podeEditar && (
                    <Button variant="ghost" size="sm" onClick={() => revogar(c.id)}>
                      <X className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog
        open={convidando}
        onClose={() => {
          setConvidando(false);
          setLinkGerado(null);
          setErro(null);
        }}
        title="Convidar usuário"
      >
        {linkGerado ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Convite criado! Envie este link para a pessoa (não há envio automático de e-mail neste ambiente de demonstração):
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elevated p-2">
              <code className="flex-1 truncate text-xs text-fg">{linkGerado}</code>
              <CopyButton texto={linkGerado} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setConvidando(false);
                  setLinkGerado(null);
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <ConvidarForm
            erro={erro}
            onCancel={() => setConvidando(false)}
            onSalvar={async (dados) => {
              setErro(null);
              try {
                const res = await apiPost<{ convite: Convite }>("/api/convites", dados);
                mutate("/api/convites");
                setLinkGerado(`${window.location.origin}/convite/${res.convite.token}`);
              } catch (err) {
                setErro(err instanceof ApiError ? err.message : "Erro ao criar convite");
              }
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/convite/${token}` : "";
  return <CopyButton texto={link} label="Copiar link" />;
}

function CopyButton({ texto, label }: { texto: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copiado ? "Copiado!" : label ?? "Copiar"}
    </Button>
  );
}

function ConvidarForm({
  onSalvar,
  onCancel,
  erro,
}: {
  onSalvar: (dados: Record<string, unknown>) => void;
  onCancel: () => void;
  erro: string | null;
}) {
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("vendedor");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar({ email, papel });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">E-mail</label>
        <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Papel</label>
        <Select value={papel} onChange={(e) => setPapel(e.target.value)}>
          <option value="vendedor">Vendedor</option>
          <option value="gestor">Gestor</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-3.5 w-3.5" /> Criar convite
        </Button>
      </div>
    </form>
  );
}
