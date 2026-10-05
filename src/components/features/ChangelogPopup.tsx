"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { fetcher, apiPost } from "@/lib/fetcher";
import type { EntradaChangelog } from "@/lib/changelog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Popup automático de novidades — montado uma vez no layout autenticado
 * (ver AppLayout.tsx). Busca o changelog, e se houver entradas mais novas
 * que Usuario.changelogVistoEm, mostra só essas e marca como vistas ao
 * fechar. Não interrompe o carregamento da página (fetch em background,
 * silencioso se falhar).
 */
export function ChangelogPopup() {
  const [entradas, setEntradas] = useState<EntradaChangelog[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetcher<{ entradas: EntradaChangelog[]; naoVistas: number }>("/api/changelog")
      .then((data) => {
        if (cancelado || data.naoVistas === 0) return;
        setEntradas(data.entradas.slice(0, data.naoVistas));
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  async function fechar() {
    setOpen(false);
    try {
      await apiPost("/api/changelog/marcar-visto");
    } catch {
      // silencioso — pior caso, o popup aparece de novo na próxima vez
    }
  }

  if (!entradas) return null;

  return (
    <Dialog open={open} onClose={fechar} title="Novidades no CALINDA" maxWidth="max-w-lg">
      <div className="space-y-5">
        {entradas.map((e) => (
          <div key={e.data}>
            <p className="mb-1 text-xs font-medium text-fg-subtle">
              {format(new Date(`${e.data}T00:00:00`), "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <h3 className="mb-2 text-sm font-semibold text-fg">{e.titulo}</h3>
            <ul className="space-y-1.5">
              {e.itens.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-fg-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={fechar}>Entendi</Button>
        </div>
      </div>
    </Dialog>
  );
}
