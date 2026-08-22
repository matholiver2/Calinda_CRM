import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CARD } from "@/lib/utils";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_LABEL, STATUS_COR, type ReuniaoCalendario } from "./types";

function rotuloDia(data: Date): string {
  if (isToday(data)) return "Hoje";
  if (isTomorrow(data)) return "Amanhã";
  return format(data, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function CalendarioLista({
  reunioes,
  onSelecionarReuniao,
}: {
  reunioes: ReuniaoCalendario[];
  onSelecionarReuniao?: (reuniao: ReuniaoCalendario) => void;
}) {
  const grupos = new Map<string, ReuniaoCalendario[]>();
  for (const r of reunioes) {
    const chave = format(new Date(r.dataHora), "yyyy-MM-dd");
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(r);
  }
  const dias = Array.from(grupos.keys()).sort();

  if (dias.length === 0) {
    return (
      <div className={`${CARD} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
          <CalendarDays className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-fg">Nenhuma reunião marcada</p>
        <p className="text-sm text-fg-subtle">As reuniões agendadas pela IA ou manualmente aparecem aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dias.map((chave) => {
        const data = new Date(`${chave}T00:00:00`);
        const doDia = grupos.get(chave)!.sort((a, b) => a.dataHora.localeCompare(b.dataHora));
        return (
          <div key={chave} className={CARD}>
            <p className="mb-4 text-sm font-semibold capitalize text-fg">{rotuloDia(data)}</p>
            <div className="space-y-3">
              {doDia.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelecionarReuniao?.(r)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border px-4 py-3 cursor-pointer hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-sm font-semibold text-fg">
                      {format(new Date(r.dataHora), "HH:mm")}
                    </div>
                    {r.vendedor && <Avatar nome={r.vendedor.nome} cor={r.vendedor.avatarCor} size="sm" />}
                    <div className="min-w-0">
                      {r.lead ? (
                        <Link
                          href={`/leads/${r.lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-sm font-medium text-fg hover:underline"
                        >
                          {r.lead.nome}
                        </Link>
                      ) : (
                        <span className="text-sm text-fg-subtle">Lead removido</span>
                      )}
                      <p className="truncate text-xs text-fg-subtle">
                        {r.vendedor ? r.vendedor.nome : "Sem vendedor atribuído"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={STATUS_COR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    {r.linkCalendario && (
                      <a
                        href={r.linkCalendario}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg-muted"
                        title="Ver no Google Calendar"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
