"use client";

import { useState } from "react";
import useSWR from "swr";
import { List, LayoutGrid, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { CalendarioLista } from "@/components/features/calendario/CalendarioLista";
import { CalendarioGrade } from "@/components/features/calendario/CalendarioGrade";
import { ReuniaoDialog } from "@/components/features/calendario/ReuniaoDialog";
import { NovaReuniaoDialog } from "@/components/features/calendario/NovaReuniaoDialog";
import type { ReuniaoCalendario } from "@/components/features/calendario/types";

type Visualizacao = "lista" | "grade";

export default function CalendarioPage() {
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("grade");
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<ReuniaoCalendario | null>(null);
  const [criandoEvento, setCriandoEvento] = useState(false);
  const { data, isLoading, mutate } = useSWR<{ reunioes: ReuniaoCalendario[] }>(
    "/api/reunioes",
    fetcher,
    { refreshInterval: 30000 }
  );

  const reunioes = data?.reunioes ?? [];

  return (
    <div>
      <PageHeader
        title="Calendário"
        description="Reuniões marcadas pela IA e pelo time, sincronizadas com o Google Calendar"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-hover p-1">
              <button
                onClick={() => setVisualizacao("lista")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  visualizacao === "lista" ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                )}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                onClick={() => setVisualizacao("grade")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  visualizacao === "grade" ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grade
              </button>
            </div>
            <Button size="sm" onClick={() => setCriandoEvento(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo evento
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="py-20 text-center text-sm text-fg-subtle">Carregando reuniões...</p>
      ) : visualizacao === "lista" ? (
        <CalendarioLista reunioes={reunioes} onSelecionarReuniao={setReuniaoSelecionada} />
      ) : (
        <CalendarioGrade reunioes={reunioes} onSelecionarReuniao={setReuniaoSelecionada} />
      )}

      <ReuniaoDialog
        reuniao={reuniaoSelecionada}
        onClose={() => setReuniaoSelecionada(null)}
        onSalvo={() => mutate()}
      />
      <NovaReuniaoDialog
        open={criandoEvento}
        onClose={() => setCriandoEvento(false)}
        onSalvo={() => mutate()}
      />
    </div>
  );
}
