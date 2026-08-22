"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Repeat2, MessageCirclePlus, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ChatThread } from "@/components/features/ChatThread";
import { fetcher, apiPost } from "@/lib/fetcher";
import type { Lead } from "@/types";

type ConfiguracoesResposta = { configuracoes: Record<string, string> };

export default function RemarketingPage() {
  const { data } = useSWR<{ leads: Lead[] }>("/api/leads?status=remarketing", fetcher, {
    refreshInterval: 6000,
  });
  const { data: configData } = useSWR<ConfiguracoesResposta>("/api/configuracoes", fetcher);
  const intervaloDias = Number(configData?.configuracoes.remarketing_intervalo_dias ?? 3);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null);

  const leads = data?.leads ?? [];
  const leadSelecionado = leads.find((l) => l.id === leadSelecionadoId) ?? null;

  async function reengajar(id: string) {
    setEnviandoId(id);
    try {
      await apiPost(`/api/leads/${id}/reengajar`);
      mutate("/api/leads?status=remarketing");
      mutate("/api/dashboard/metrica-geral");
    } finally {
      setEnviandoId(null);
    }
  }

  function proximoContatoEm(atualizadoEm: string): string {
    const proximo = new Date(new Date(atualizadoEm).getTime() + intervaloDias * 86_400_000);
    return `Próximo contato: ${proximo.toLocaleDateString("pt-BR")}`;
  }

  return (
    <div>
      <PageHeader
        title="Remarketing"
        description="Leads que não fecharam após a reunião — a IA reengaja automaticamente com base no histórico da conversa"
      />

      {leads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
          <Repeat2 className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm font-medium text-fg">Nenhum lead em remarketing no momento</p>
          <p className="text-xs text-fg-subtle">
            Leads entram aqui automaticamente quando uma reunião é marcada como &quot;não fechou&quot;.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id} accentColor="#A78BFA" className="p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar nome={lead.nome} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${lead.id}`} className="truncate text-sm font-semibold text-fg hover:underline">
                    {lead.nome}
                  </Link>
                  <p className="text-xs text-fg-subtle">{lead.origem}</p>
                </div>
              </div>
              <div className="mb-3 flex items-center justify-between text-xs">
                <Badge color="#A78BFA">Remarketing</Badge>
                <span className="text-fg-subtle">{proximoContatoEm(lead.atualizadoEm)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setLeadSelecionadoId(lead.id)}>
                  <MessageSquareText className="h-3.5 w-3.5" /> Ver conversa
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  loading={enviandoId === lead.id}
                  onClick={() => reengajar(lead.id)}
                >
                  <MessageCirclePlus className="h-3.5 w-3.5" /> Reengajar agora
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!leadSelecionado}
        onClose={() => setLeadSelecionadoId(null)}
        title={leadSelecionado?.nome ?? ""}
        maxWidth="max-w-lg"
      >
        {leadSelecionado && <ChatThread leadId={leadSelecionado.id} compact />}
      </Dialog>
    </div>
  );
}
