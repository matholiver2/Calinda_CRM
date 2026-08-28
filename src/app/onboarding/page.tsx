"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Send, SkipForward, CheckCircle2, PartyPopper } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Turno = { autor: "assistente" | "usuario"; texto: string };
type EtapaProposta = { nome: string; ordem: number; cor: string; descricaoObjetivo: string };
type AgenteProposto = { etapaNome: string; nome: string; persona: string; objetivo: string };
type Proposta = { etapas: EtapaProposta[]; agentes: AgenteProposto[] };

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingConteudo />
    </Suspense>
  );
}

function OnboardingConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const modoPessoal = params.get("modo") === "pessoal";

  const [historico, setHistorico] = useState<Turno[]>([]);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [concluidoPessoal, setConcluidoPessoal] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const iniciouRef = useRef(false);

  const endpointMensagem = modoPessoal ? "/api/onboarding/pessoal/mensagem" : "/api/onboarding/mensagem";
  const endpointConcluir = modoPessoal ? "/api/onboarding/pessoal/concluir" : "/api/onboarding/concluir";

  async function enviarTurno(historicoAtual: Turno[]) {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await apiPost<{
        resposta: string;
        concluido: boolean;
        proposta?: Proposta | null;
      }>(endpointMensagem, { historico: historicoAtual });

      setHistorico([...historicoAtual, { autor: "assistente", texto: resultado.resposta }]);
      if (resultado.concluido) {
        if (modoPessoal) setConcluidoPessoal(true);
        else if (resultado.proposta) setProposta(resultado.proposta);
      }
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao conversar com o assistente");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (iniciouRef.current) return;
    iniciouRef.current = true;
    enviarTurno([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico]);

  async function enviar() {
    if (!mensagem.trim() || carregando) return;
    const novoHistorico: Turno[] = [...historico, { autor: "usuario", texto: mensagem.trim() }];
    setHistorico(novoHistorico);
    setMensagem("");
    setEnviando(true);
    try {
      await enviarTurno(novoHistorico);
    } finally {
      setEnviando(false);
    }
  }

  async function pular() {
    await apiPost(endpointConcluir);
    router.push("/dashboard");
    router.refresh();
  }

  async function confirmarProposta() {
    if (!proposta) return;
    setCriando(true);
    setErro(null);
    try {
      await apiPost(endpointConcluir, proposta);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar a configuração");
      setCriando(false);
    }
  }

  async function finalizarPessoal() {
    setCriando(true);
    setErro(null);
    try {
      await apiPost(endpointConcluir);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao concluir");
      setCriando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] bg-bg-elevated shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <div>
              <p className="text-sm font-semibold text-fg">
                {modoPessoal ? "Bem-vindo(a) ao CALINDA" : "Configuração inicial"}
              </p>
              <p className="text-xs text-fg-subtle">
                {modoPessoal ? "Só uma apresentação rápida antes de começar" : "Vamos deixar a IA no jeito do seu negócio"}
              </p>
            </div>
          </div>
          <button
            onClick={pular}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-fg-subtle hover:bg-surface-hover hover:text-fg-muted"
          >
            <SkipForward className="h-3.5 w-3.5" /> Pular por agora
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {historico.map((t, i) => (
            <div key={i} className={cn("flex", t.autor === "usuario" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                  t.autor === "usuario" ? "bg-blue-50 text-fg" : "bg-accent-soft text-fg"
                )}
              >
                {t.autor === "assistente" && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-accent">
                    <Sparkles className="h-3 w-3" /> Assistente CALINDA
                  </p>
                )}
                <p className="whitespace-pre-wrap">{t.texto}</p>
              </div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-fg-subtle">Digitando...</div>
            </div>
          )}

          {proposta && (
            <div className="rounded-[14px] border border-accent/30 bg-accent-soft/50 p-4">
              <p className="mb-3 text-sm font-semibold text-fg">Proposta de configuração</p>
              <div className="space-y-2">
                {proposta.etapas.map((etapa) => {
                  const agente = proposta.agentes.find((a) => a.etapaNome === etapa.nome);
                  return (
                    <div key={etapa.nome} className="rounded-lg bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} />
                        <p className="text-sm font-medium text-fg">{etapa.nome}</p>
                      </div>
                      <p className="mt-0.5 pl-4 text-xs text-fg-subtle">{etapa.descricaoObjetivo}</p>
                      {agente && (
                        <p className="mt-1.5 pl-4 text-xs text-fg-muted">
                          <span className="font-medium text-accent">{agente.nome}:</span> {agente.objetivo}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button className="mt-4 w-full" loading={criando} onClick={confirmarProposta}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Criar minha configuração
              </Button>
            </div>
          )}

          {concluidoPessoal && (
            <div className="rounded-[14px] border border-accent/30 bg-accent-soft/50 p-4 text-center">
              <PartyPopper className="mx-auto mb-2 h-6 w-6 text-accent" />
              <Button className="w-full" loading={criando} onClick={finalizarPessoal}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Começar a usar o CALINDA
              </Button>
            </div>
          )}

          {erro && <p className="text-sm text-danger">{erro}</p>}
          <div ref={fimRef} />
        </div>

        {!proposta && !concluidoPessoal && (
          <div className="flex items-center gap-2 border-t border-border p-4">
            <input
              autoFocus
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Escreva sua resposta..."
              disabled={carregando}
              className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent disabled:opacity-50"
            />
            <Button onClick={enviar} loading={enviando} disabled={!mensagem.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
