"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Bot, BotOff, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <Link
      href={`/leads/${lead.id}`}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "block cursor-grab rounded-[12px] bg-surface p-3 shadow-[0_4px_14px_rgba(16,24,20,0.06)] transition-shadow select-none active:cursor-grabbing hover:shadow-[0_6px_18px_rgba(16,24,20,0.10)]",
        isDragging && "opacity-40"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar nome={lead.nome} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{lead.nome}</p>
            <p className="truncate text-xs text-fg-subtle">{lead.origem}</p>
          </div>
        </div>
        {lead.iaAtiva ? (
          <Bot className="h-3.5 w-3.5 shrink-0 text-accent" />
        ) : (
          <BotOff className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-fg-subtle">
          <MessageCircle className="h-3 w-3" />
          {lead._count?.mensagens ?? 0}
        </span>
        <span className="text-[11px] text-fg-subtle">
          {formatDistanceToNow(new Date(lead.atualizadoEm), { locale: ptBR })}
        </span>
      </div>
    </Link>
  );
}
