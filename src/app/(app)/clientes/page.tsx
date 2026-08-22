"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search, MessageCircle, FileText, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { fetcher } from "@/lib/fetcher";
import { formatarTelefone } from "@/lib/utils";
import type { Lead } from "@/types";

export default function ClientesPage() {
  const { data } = useSWR<{ leads: Lead[] }>("/api/leads?status=cliente", fetcher, { refreshInterval: 15000 });
  const [busca, setBusca] = useState("");

  const clientes = useMemo(() => {
    const todos = data?.leads ?? [];
    return todos.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [data, busca]);

  return (
    <div>
      <PageHeader title="Clientes" description={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"} na carteira`} />

      <Card className="mb-5 flex items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome"
            className="pl-10"
          />
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
              <Card key={cliente.id} className="p-4">
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
                  <th className="pb-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-border">
                    <td className="py-4 pr-4">
                      <Link href={`/leads/${cliente.id}`} className="flex items-center gap-3">
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
    </div>
  );
}
