"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DictationButton } from "@/components/ui/DictationButton";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Turno = { autor: "assistente" | "usuario"; texto: string };

const SAUDACAO: Turno = {
  autor: "assistente",
  texto: "Oi! Sou seu assistente de vendas por aqui dentro do CALINDA. Me conta o que você precisa — de um lead específico, uma mensagem pra revisar, ou uma dúvida do dia a dia.",
};

const SUGESTOES = [
  "Como responder um lead que sumiu depois de pedir orçamento?",
  "Me ajuda a montar um argumento pra fechar uma reunião hoje",
  "Quais leads eu devo priorizar agora?",
];

export default function AssistentePage() {
  const [historico, setHistorico] = useState<Turno[] | null>(null);
  // Carrega o histórico salvo (até 30 dias) uma única vez, no callback do
  // SWR (não num efeito síncrono) — depois disso o estado local vira a
  // fonte de verdade, pra não perder o que a pessoa já vê na tela caso o
  // SWR revalide o histórico em segundo plano.
  const { isLoading } = useSWR<{ historico: Turno[] }>("/api/assistente/mensagens", fetcher, {
    onSuccess: (data) => {
      setHistorico((atual) => atual ?? (data.historico.length > 0 ? data.historico : [SAUDACAO]));
    },
  });
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico]);

  async function enviar(texto?: string) {
    const conteudo = (texto ?? mensagem).trim();
    if (!conteudo || enviando || !historico) return;
    const novoHistorico: Turno[] = [...historico, { autor: "usuario", texto: conteudo }];
    setHistorico(novoHistorico);
    setMensagem("");
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await apiPost<{ resposta: string }>("/api/assistente/mensagem", { texto: conteudo });
      setHistorico([...novoHistorico, { autor: "assistente", texto: resultado.resposta }]);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao conversar com o assistente");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader title="Assistente" description="Chat de apoio pra vender melhor, com o contexto da sua empresa" />

      <div className="flex flex-1 flex-col overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-float)]">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {isLoading && historico === null && (
            <p className="text-center text-sm text-fg-subtle">Carregando conversa...</p>
          )}
          {historico?.map((t, i) => (
            <div key={i} className={cn("flex", t.autor === "usuario" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                  t.autor === "usuario" ? "bg-blue-50 text-fg" : "bg-accent-soft text-fg"
                )}
              >
                {t.autor === "assistente" && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-accent">
                    <Sparkles className="h-3 w-3" /> Assistente
                  </p>
                )}
                <p className="whitespace-pre-wrap">{t.texto}</p>
              </div>
            </div>
          ))}
          {enviando && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-fg-subtle">Pensando...</div>
            </div>
          )}
          {historico?.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <div ref={fimRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <input
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="Pergunte alguma coisa..."
            disabled={enviando}
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent disabled:opacity-50"
          />
          <DictationButton valorAtual={mensagem} onTexto={setMensagem} />
          <Button onClick={() => enviar()} loading={enviando} disabled={!mensagem.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
