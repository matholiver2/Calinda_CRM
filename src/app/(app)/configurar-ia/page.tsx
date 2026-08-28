"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, MessageSquareText, Building2, Repeat2, CalendarClock, Sparkles, FlagOff } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { DictationButton } from "@/components/ui/DictationButton";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { CARD } from "@/lib/utils";
import { AgentesConfig } from "@/components/features/config/AgentesConfig";

type ConfiguracoesResposta = { configuracoes: Record<string, string> };

export default function ConfigurarIaPage() {
  const { data: meData } = useSWR<{ usuario: { papel: string } }>("/api/auth/me", fetcher);
  const papel = meData?.usuario?.papel;
  const podeEditar = papel === "admin" || papel === "gestor" || papel === "super_admin";

  const { data, mutate } = useSWR<ConfiguracoesResposta>("/api/configuracoes", fetcher);

  return (
    <div>
      <PageHeader
        title="Configurar IA"
        description="Tudo que envolve a automação por IA — primeira mensagem, contexto da empresa, remarketing e agentes"
        actions={
          podeEditar && (
            <a href="/onboarding">
              <Button variant="secondary" size="sm">
                <Sparkles className="h-3.5 w-3.5" /> Refazer onboarding
              </Button>
            </a>
          )
        }
      />

      <div className="space-y-5">
        <TextoLongoCard
          key={`primeira-${data ? "carregado" : "carregando"}`}
          icone={MessageSquareText}
          titulo="Primeira mensagem"
          descricao='Enviada automaticamente pra todo lead novo, exatamente como escrita aqui — use {nome} e {empresa} como variáveis.'
          chave="primeira_mensagem_template"
          valorInicial={data?.configuracoes.primeira_mensagem_template ?? ""}
          placeholder="Olá, {nome}! Aqui é da {empresa}..."
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <TextoLongoCard
          key={`sobre-${data ? "carregado" : "carregando"}`}
          icone={Building2}
          titulo="Sobre a empresa"
          descricao="Contexto do negócio (o que vende, tom de voz) que a IA usa pra conversar de acordo com a sua empresa — preenchido no onboarding, editável aqui."
          chave="empresa_sobre"
          valorInicial={data?.configuracoes.empresa_sobre ?? ""}
          placeholder="Ex: Somos uma consultoria de vendas B2B, falamos de forma direta e informal..."
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <TextoLongoCard
          key={`remarketing-${data ? "carregado" : "carregando"}`}
          icone={Repeat2}
          titulo="Mensagem de remarketing"
          descricao='Enviada automaticamente pro lead reengajar, exatamente como escrita aqui — use {nome} e {empresa}. Deixe em branco pra IA gerar a mensagem sozinha a cada vez, olhando o histórico da conversa.'
          chave="remarketing_mensagem_template"
          valorInicial={data?.configuracoes.remarketing_mensagem_template ?? ""}
          placeholder="Oi, {nome}! Passando pra saber se ainda tem interesse em falar com a gente na {empresa}..."
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <TextoLongoCard
          key={`finalizacao-${data ? "carregado" : "carregando"}`}
          icone={FlagOff}
          titulo="Mensagem de finalização"
          descricao='Enviada automaticamente quando a conversa entra na etapa "Finalizado" do funil — use {nome} e {empresa}.'
          chave="mensagem_finalizacao_template"
          valorInicial={data?.configuracoes.mensagem_finalizacao_template ?? ""}
          placeholder="Foi um prazer falar com você, {nome}! Se precisar de mais alguma coisa, é só chamar por aqui."
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <IntervaloRemarketingCard
          key={`intervalo-${data ? "carregado" : "carregando"}`}
          valorInicial={data?.configuracoes.remarketing_intervalo_dias ?? "3"}
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-fg">Agentes de IA por etapa do funil</h2>
          <AgentesConfig podeEditar={podeEditar} />
        </div>
      </div>
    </div>
  );
}

function TextoLongoCard({
  icone: Icone,
  titulo,
  descricao,
  chave,
  valorInicial,
  placeholder,
  podeEditar,
  onSalvo,
}: {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  chave: string;
  valorInicial: string;
  placeholder: string;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setLoading(true);
    try {
      await apiPatch("/api/configuracoes", { chave, valor });
      setSucesso(true);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
            <Icone className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
            <p className="text-xs text-fg-subtle">{descricao}</p>
          </div>
        </div>
        {podeEditar && <DictationButton valorAtual={valor} onTexto={setValor} />}
      </div>
      <form onSubmit={salvar} className="space-y-3">
        <Textarea rows={5} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} disabled={!podeEditar} />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {sucesso && <p className="text-sm text-success">Salvo.</p>}
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

function IntervaloRemarketingCard({
  valorInicial,
  podeEditar,
  onSalvo,
}: {
  valorInicial: string;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [intervaloDias, setIntervaloDias] = useState(valorInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setLoading(true);
    try {
      await apiPatch("/api/configuracoes", { chave: "remarketing_intervalo_dias", valor: intervaloDias });
      setSucesso(true);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${CARD} max-w-md`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <Repeat2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Intervalo de remarketing</h2>
          <p className="text-xs text-fg-subtle">Dias sem contato até a IA reengajar automaticamente um lead.</p>
        </div>
      </div>
      <form onSubmit={salvar} className="space-y-3">
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
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {sucesso && <p className="text-sm text-success">Intervalo salvo.</p>}
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
