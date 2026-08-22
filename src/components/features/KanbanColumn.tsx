"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { LeadCard } from "@/components/features/LeadCard";
import type { Etapa, Lead } from "@/types";

export function KanbanColumn({ etapa, leads }: { etapa: Etapa; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-[18px] bg-surface shadow-[var(--shadow-card)] transition-colors",
        isOver && "shadow-[0_8px_24px_rgba(33,121,64,0.18)]"
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: etapa.cor }} />
          <h3 className="text-sm font-semibold text-fg">{etapa.nome}</h3>
        </div>
        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-fg-muted">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-[12px] border border-dashed border-border text-xs text-fg-subtle">
            Nenhum lead
          </div>
        )}
      </div>
    </div>
  );
}
