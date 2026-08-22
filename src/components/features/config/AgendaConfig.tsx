"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, CalendarClock, Video, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { CARD } from "@/lib/utils";

type ConfiguracoesResposta = { configuracoes: Record<string, string> };

export function AgendaConfig({ podeEditar }: { podeEditar: boolean }) {
  const { data, mutate } = useSWR<ConfiguracoesResposta>("/api/configuracoes", fetcher);

  return (
    <AgendaConfigForm
      key={data ? "carregado" : "carregando"}
      podeEditar={podeEditar}
      configuracoes={data?.configuracoes ?? {}}
      onSalvo={() => mutate()}
    />
  );
}

function AgendaConfigForm({
  podeEditar,
  configuracoes,
  onSalvo,
}: {
  podeEditar: boolean;
  configuracoes: Record<string, string>;
  onSalvo: () => void;
}) {
  const [meetLink, setMeetLink] = useState(configuracoes.google_meet_link ?? "");
  const [intervaloDias, setIntervaloDias] = useState(configuracoes.remarketing_intervalo_dias ?? "3");
  const [loading, setLoading] = useState<"meet" | "intervalo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<"meet" | "intervalo" | null>(null);

  async function salvar(chave: string, valor: string, chaveLoading: "meet" | "intervalo") {
    setErro(null);
    setSucesso(null);
    setLoading(chaveLoading);
    try {
      await apiPatch("/api/configuracoes", { chave, valor });
      setSucesso(chaveLoading);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className={CARD}>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">Link do Google Meet</h2>
            <p className="text-xs text-fg-subtle">Usado quando uma reunião é marcada como &quot;Google Meet&quot;.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar("google_meet_link", meetLink, "meet");
          }}
          className="space-y-3"
        >
          <Input
            type="url"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            disabled={!podeEditar}
          />
          {erro && loading === null && <p className="text-sm text-danger">{erro}</p>}
          {sucesso === "meet" && <p className="text-sm text-success">Link salvo.</p>}
          {podeEditar && (
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={loading === "meet"}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          )}
        </form>
      </div>

      <div className={CARD}>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
            <Repeat2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">Intervalo de remarketing</h2>
            <p className="text-xs text-fg-subtle">Dias sem contato até a IA reengajar automaticamente um lead.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar("remarketing_intervalo_dias", intervaloDias, "intervalo");
          }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              className="max-w-[120px]"
              value={intervaloDias}
              onChange={(e) => setIntervaloDias(e.target.value)}
              disabled={!podeEditar}
            />
            <span className="flex items-center gap-1 text-sm text-fg-muted">
              <CalendarClock className="h-3.5 w-3.5" /> dias
            </span>
          </div>
          {sucesso === "intervalo" && <p className="text-sm text-success">Intervalo salvo.</p>}
          {podeEditar && (
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={loading === "intervalo"}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
