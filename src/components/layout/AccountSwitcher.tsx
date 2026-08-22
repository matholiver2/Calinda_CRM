"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronDown, Check, UserPlus, LogOut, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { papelLabel, cn } from "@/lib/utils";
import type { SessionPayload } from "@/lib/auth";

type Conta = { id: string; nome: string; email: string; papel: string };

export function AccountSwitcher({ usuario }: { usuario: SessionPayload }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ contas: Conta[]; ativaId: string }>("/api/auth/contas", fetcher);
  const [aberto, setAberto] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [trocandoId, setTrocandoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setAdicionando(false);
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [aberto]);

  async function trocarPara(id: string) {
    if (id === data?.ativaId) return;
    setTrocandoId(id);
    try {
      await apiPost("/api/auth/contas/trocar", { usuarioId: id });
      setAberto(false);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setTrocandoId(null);
    }
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const contas = data?.contas ?? [];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        className="ml-1 flex items-center gap-1.5 rounded-full pl-1 pr-2 hover:bg-surface-hover"
      >
        <Avatar nome={usuario.nome} size="sm" />
        <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-[72px] z-50 rounded-[14px] border border-border bg-bg-elevated shadow-[var(--shadow-float)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-72">
          {adicionando ? (
            <AdicionarContaForm
              onCancelar={() => setAdicionando(false)}
              onAdicionada={() => {
                setAdicionando(false);
                mutate();
              }}
            />
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-fg">{usuario.nome}</p>
                <p className="truncate text-xs text-fg-subtle">{usuario.email}</p>
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5">
                {contas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => trocarPara(c.id)}
                    disabled={trocandoId === c.id}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-hover disabled:opacity-60"
                  >
                    <Avatar nome={c.nome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{c.nome}</p>
                      <p className="truncate text-xs text-fg-subtle">
                        {c.email} · {c.papel === "super_admin" ? "Super Admin" : papelLabel(c.papel)}
                      </p>
                    </div>
                    {c.id === data?.ativaId && <Check className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                ))}
              </div>

              <div className="space-y-1 border-t border-border p-1.5">
                <button
                  onClick={() => setAdicionando(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                  <UserPlus className="h-4 w-4" /> Adicionar conta
                </button>
                <button
                  onClick={sair}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-fg-muted hover:bg-danger/10 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdicionarContaForm({ onCancelar, onAdicionada }: { onCancelar: () => void; onAdicionada: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/contas/adicionar", { email, senha });
      onAdicionada();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao adicionar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-fg">Adicionar conta</p>
        <button type="button" onClick={onCancelar} className="text-fg-subtle hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2.5">
        <Input
          autoFocus
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          required
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erro && <p className="text-xs text-danger">{erro}</p>}
        <Button type="submit" size="sm" className={cn("w-full")} loading={loading}>
          Adicionar
        </Button>
      </div>
    </form>
  );
}
