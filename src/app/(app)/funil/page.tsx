"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { KanbanColumn } from "@/components/features/KanbanColumn";
import { LeadCard } from "@/components/features/LeadCard";
import { fetcher, apiPatch } from "@/lib/fetcher";
import type { Etapa, Lead } from "@/types";

export default function FunilPage() {
  const { data: etapasData } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const { data: leadsData } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher, { refreshInterval: 6000 });
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const etapas = etapasData?.etapas ?? [];
  const leads = leadsData?.leads ?? [];

  function onDragStart(event: DragStartEvent) {
    setActiveLead((event.active.data.current?.lead as Lead) ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = String(active.id);
    const novaEtapaId = String(over.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.etapaAtualId === novaEtapaId) return;

    const key = "/api/leads";
    mutate(
      key,
      (current?: { leads: Lead[] }) => {
        if (!current) return current;
        const etapa = etapas.find((e) => e.id === novaEtapaId);
        return {
          leads: current.leads.map((l) =>
            l.id === leadId && etapa ? { ...l, etapaAtualId: novaEtapaId, etapaAtual: etapa } : l
          ),
        };
      },
      false
    );

    try {
      await apiPatch(`/api/leads/${leadId}/etapa`, { etapaId: novaEtapaId });
    } finally {
      mutate(key);
      mutate("/api/dashboard/metrica-geral");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Funil" description="Arraste os cards para mover leads entre etapas" />
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {etapas.map((etapa) => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              leads={leads.filter((l) => l.etapaAtualId === etapa.id)}
            />
          ))}
        </div>
        <DragOverlay>{activeLead && <LeadCard lead={activeLead} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
