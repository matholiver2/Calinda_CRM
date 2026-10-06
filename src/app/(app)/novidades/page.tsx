"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { fetcher, apiPost } from "@/lib/fetcher";
import type { EntradaChangelog } from "@/lib/changelog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NovidadesPage() {
  const { data } = useSWR<{ entradas: EntradaChangelog[]; naoVistas: number }>("/api/changelog", fetcher);

  // Visitar a tela também conta como "visto" — evita o popup aparecer de
  // novo se a pessoa fechou sem querer antes de ler tudo.
  useEffect(() => {
    apiPost("/api/changelog/marcar-visto").catch(() => {});
  }, []);

  const entradas = data?.entradas ?? [];

  return (
    <div>
      <PageHeader title="Novidades" description="O que mudou no Calinda recentemente" />

      {entradas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg-subtle">
            <Megaphone className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-fg">Nenhuma novidade registrada ainda</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {entradas.map((e) => (
            <Card key={e.data} className="p-5">
              <p className="mb-1 text-xs font-medium text-fg-subtle">
                {format(new Date(`${e.data}T00:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <h2 className="mb-3 text-base font-semibold text-fg">{e.titulo}</h2>
              <ul className="space-y-2">
                {e.itens.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-fg-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
