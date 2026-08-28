"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, Video } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setLoading(true);
    try {
      await apiPatch("/api/configuracoes", { chave: "google_meet_link", valor: meetLink });
      setSucesso(true);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${CARD} max-w-xl`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <Video className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Link do Google Meet</h2>
          <p className="text-xs text-fg-subtle">Usado quando uma reunião é marcada como &quot;Google Meet&quot;.</p>
        </div>
      </div>
      <form onSubmit={salvar} className="space-y-3">
        <Input
          type="url"
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          value={meetLink}
          onChange={(e) => setMeetLink(e.target.value)}
          disabled={!podeEditar}
        />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {sucesso && <p className="text-sm text-success">Link salvo.</p>}
        {podeEditar && (
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={loading}>
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
