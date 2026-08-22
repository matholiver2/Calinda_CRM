"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CARD_LG, cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_COR, STATUS_LABEL, type ReuniaoCalendario } from "./types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_VISIVEIS = 3;

export function CalendarioGrade({
  reunioes,
  onSelecionarReuniao,
}: {
  reunioes: ReuniaoCalendario[];
  onSelecionarReuniao?: (reuniao: ReuniaoCalendario) => void;
}) {
  const [mesAtual, setMesAtual] = useState(() => startOfMonth(new Date()));

  const inicioGrade = startOfWeek(startOfMonth(mesAtual), { locale: ptBR });
  const fimGrade = endOfWeek(endOfMonth(mesAtual), { locale: ptBR });
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade });

  const porDia = new Map<string, ReuniaoCalendario[]>();
  for (const r of reunioes) {
    const chave = format(new Date(r.dataHora), "yyyy-MM-dd");
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave)!.push(r);
  }

  return (
    <div className={CARD_LG}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-fg">
          {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMesAtual((m) => subMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMesAtual(startOfMonth(new Date()))}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
          >
            Hoje
          </button>
          <button
            onClick={() => setMesAtual((m) => addMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-hover"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-medium text-fg-subtle">
            {d}
          </div>
        ))}
        {dias.map((dia) => {
          const chave = format(dia, "yyyy-MM-dd");
          const doDia = (porDia.get(chave) ?? []).sort((a, b) => a.dataHora.localeCompare(b.dataHora));
          const foraDoMes = !isSameMonth(dia, mesAtual);

          return (
            <div
              key={chave}
              className={cn(
                "min-h-[92px] rounded-[12px] border border-border p-2",
                foraDoMes ? "bg-surface-hover" : "bg-surface"
              )}
            >
              <p
                className={cn(
                  "mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  isToday(dia) ? "bg-accent font-semibold text-accent-foreground" : "",
                  foraDoMes && !isToday(dia) ? "text-fg-subtle" : "text-fg-muted"
                )}
              >
                {format(dia, "d")}
              </p>
              <div className="space-y-1">
                {doDia.slice(0, MAX_VISIVEIS).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelecionarReuniao?.(r)}
                    title={`${format(new Date(r.dataHora), "HH:mm")} · ${r.lead?.nome ?? "Lead removido"}`}
                    className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] hover:bg-surface-hover"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COR[r.status] }} />
                    <span className="truncate text-fg-muted">
                      {format(new Date(r.dataHora), "HH:mm")} {r.lead?.nome ?? ""}
                    </span>
                  </button>
                ))}
                {doDia.length > MAX_VISIVEIS && (
                  <p className="px-1 text-[10px] text-fg-subtle">+{doDia.length - MAX_VISIVEIS} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {reunioes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4 text-xs text-fg-muted">
          {(Object.keys(STATUS_COR) as ReuniaoCalendario["status"][]).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COR[status] }} />
              {STATUS_LABEL[status]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
