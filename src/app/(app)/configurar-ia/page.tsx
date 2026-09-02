"use client";

import { useState } from "react";
import useSWR from "swr";
import { Save, MessageSquareText, Building2, Repeat2, CalendarClock, Sparkles, Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { DictationButton } from "@/components/ui/DictationButton";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { CARD, cn } from "@/lib/utils";
import { AgentesConfig } from "@/components/features/config/AgentesConfig";

type ConfiguracoesResposta = { configuracoes: Record<string, string> };
type Modo = "literal" | "ia";

const MENSAGENS_TABS = [
  {
    chave: "primeira_mensagem",
    label: "Primeira mensagem",
    descricao: "Enviada automaticamente pra todo lead novo assim que ele é criado.",
    placeholder: "Olá, {nome}! Aqui é da {empresa}...",
  },
  {
    chave: "remarketing_mensagem",
    label: "Remarketing",
    descricao: "Enviada automaticamente pro lead reengajar depois de um tempo sem contato.",
    placeholder: "Oi, {nome}! Passando pra saber se ainda tem interesse em falar com a gente na {empresa}...",
  },
  {
    chave: "mensagem_finalizacao",
    label: "Finalização",
    descricao: 'Enviada automaticamente quando a conversa entra na etapa "Finalizado" do funil.',
    placeholder: "Foi um prazer falar com você, {nome}! Se precisar de mais alguma coisa, é só chamar por aqui.",
  },
  {
    chave: "followup_mensagem",
    label: "Follow-up",
    descricao: 'Enviada periodicamente pros clientes (aba "Cliente" do lead) — um check-in perguntando se está tudo bem.',
    placeholder: "Oi, {nome}! Passando aqui pra saber se está tudo bem e se você precisa de mais alguma coisa da {empresa}. 😊",
  },
] as const;

export default function ConfigurarIaPage() {
  const { data: meData } = useSWR<{ usuario: { papel: string } }>("/api/auth/me", fetcher);
  const papel = meData?.usuario?.papel;
  const podeEditar = papel === "admin" || papel === "gestor" || papel === "super_admin";

  const { data, mutate } = useSWR<ConfiguracoesResposta>("/api/configuracoes", fetcher);

  return (
    <div>
      <PageHeader
        title="Configurar IA"
        description="Tudo que envolve a automação por IA — mensagens, contexto da empresa, remarketing e agentes"
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
        <MensagensAutomaticasCard
          key={`mensagens-${data ? "carregado" : "carregando"}`}
          configuracoes={data?.configuracoes ?? {}}
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

        <ConviteReuniaoEmailCard
          key={`convite-reuniao-${data ? "carregado" : "carregando"}`}
          assuntoInicial={data?.configuracoes.convite_reuniao_email_assunto ?? ""}
          corpoInicial={data?.configuracoes.convite_reuniao_email_corpo ?? ""}
          modoInicial={(data?.configuracoes.convite_reuniao_email_modo as Modo) ?? "literal"}
          podeEditar={podeEditar}
          onSalvo={() => mutate()}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <IntervaloDiasCard
            key={`intervalo-remarketing-${data ? "carregado" : "carregando"}`}
            chave="remarketing_intervalo_dias"
            titulo="Intervalo de remarketing"
            descricao="Dias sem contato até a IA reengajar automaticamente um lead."
            valorInicial={data?.configuracoes.remarketing_intervalo_dias ?? "3"}
            podeEditar={podeEditar}
            onSalvo={() => mutate()}
          />
          <IntervaloDiasCard
            key={`intervalo-followup-${data ? "carregado" : "carregando"}`}
            chave="followup_intervalo_dias"
            titulo="Intervalo de follow-up"
            descricao="Dias sem contato até o sistema mandar um check-in pra um cliente."
            valorInicial={data?.configuracoes.followup_intervalo_dias ?? "30"}
            podeEditar={podeEditar}
            onSalvo={() => mutate()}
          />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-fg">Agentes de IA por etapa do funil</h2>
          <AgentesConfig podeEditar={podeEditar} />
        </div>
      </div>
    </div>
  );
}

/** Botão duplo "manda igual escrito" vs "IA usa como base" — reaproveitado em toda mensagem configurável. */
function ModoToggle({
  modo,
  onChange,
  podeEditar,
}: {
  modo: Modo;
  onChange: (modo: Modo) => void;
  podeEditar: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={!podeEditar}
        onClick={() => onChange("literal")}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
          modo === "literal" ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
        )}
      >
        Enviar exatamente como está
      </button>
      <button
        type="button"
        disabled={!podeEditar}
        onClick={() => onChange("ia")}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
          modo === "ia" ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
        )}
      >
        Usar como base pra IA escrever
      </button>
    </div>
  );
}

function MensagensAutomaticasCard({
  configuracoes,
  podeEditar,
  onSalvo,
}: {
  configuracoes: Record<string, string>;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [abaAtiva, setAbaAtiva] = useState<(typeof MENSAGENS_TABS)[number]["chave"]>("primeira_mensagem");
  const aba = MENSAGENS_TABS.find((t) => t.chave === abaAtiva)!;

  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <MessageSquareText className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Mensagens automáticas</h2>
          <p className="text-xs text-fg-subtle">
            Primeira mensagem, remarketing, finalização e follow-up — use {"{nome}"} e {"{empresa}"} como variáveis.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {MENSAGENS_TABS.map((t) => (
          <button
            key={t.chave}
            onClick={() => setAbaAtiva(t.chave)}
            className={cn(
              "shrink-0 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
              abaAtiva === t.chave ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <MensagemConfiguravelForm
        key={aba.chave}
        chaveTemplate={`${aba.chave}_template`}
        chaveModo={`${aba.chave}_modo`}
        valorInicial={configuracoes[`${aba.chave}_template`] ?? ""}
        modoInicial={(configuracoes[`${aba.chave}_modo`] as Modo) ?? "literal"}
        descricao={aba.descricao}
        placeholder={aba.placeholder}
        podeEditar={podeEditar}
        onSalvo={onSalvo}
      />
    </div>
  );
}

function MensagemConfiguravelForm({
  chaveTemplate,
  chaveModo,
  valorInicial,
  modoInicial,
  descricao,
  placeholder,
  podeEditar,
  onSalvo,
}: {
  chaveTemplate: string;
  chaveModo: string;
  valorInicial: string;
  modoInicial: Modo;
  descricao: string;
  placeholder: string;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setLoading(true);
    try {
      await apiPatch("/api/configuracoes", { chave: chaveTemplate, valor });
      await apiPatch("/api/configuracoes", { chave: chaveModo, valor: modo });
      setSucesso(true);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <p className="text-xs text-fg-subtle">{descricao}</p>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Como enviar</label>
        <ModoToggle modo={modo} onChange={setModo} podeEditar={podeEditar} />
        <p className="mt-1.5 text-xs text-fg-subtle">
          {modo === "literal"
            ? "A mensagem sai exatamente como escrita abaixo."
            : "A IA usa o texto abaixo só como referência e escreve uma versão adaptada a cada envio."}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-xs font-medium text-fg-muted">Texto</label>
          {podeEditar && <DictationButton valorAtual={valor} onTexto={setValor} />}
        </div>
        <Textarea rows={5} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={placeholder} disabled={!podeEditar} />
      </div>

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

const ASSUNTO_CONVITE_PADRAO = "Reunião com {empresa} — {data}";
const CORPO_CONVITE_PADRAO =
  "Olá, {nome}!\n\nSua reunião com a {empresa} está confirmada para {data}.\n\nLink do Google Meet: {link}\n\nAté lá!";

function ConviteReuniaoEmailCard({
  assuntoInicial,
  corpoInicial,
  modoInicial,
  podeEditar,
  onSalvo,
}: {
  assuntoInicial: string;
  corpoInicial: string;
  modoInicial: Modo;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [assunto, setAssunto] = useState(assuntoInicial);
  const [corpo, setCorpo] = useState(corpoInicial);
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setLoading(true);
    try {
      await apiPatch("/api/configuracoes", { chave: "convite_reuniao_email_assunto", valor: assunto });
      await apiPatch("/api/configuracoes", { chave: "convite_reuniao_email_corpo", valor: corpo });
      await apiPatch("/api/configuracoes", { chave: "convite_reuniao_email_modo", valor: modo });
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
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-fg">Convite de reunião por e-mail</h2>
            <p className="text-xs text-fg-subtle">
              Enviado pro lead quando uma reunião é marcada como Google Meet — use {"{nome}"}, {"{empresa}"},{" "}
              {"{data}"} e {"{link}"} como variáveis.
            </p>
          </div>
        </div>
        {podeEditar && <DictationButton valorAtual={corpo} onTexto={setCorpo} />}
      </div>
      <form onSubmit={salvar} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Assunto</label>
          <Input
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder={ASSUNTO_CONVITE_PADRAO}
            disabled={!podeEditar}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Como enviar o corpo do e-mail</label>
          <ModoToggle modo={modo} onChange={setModo} podeEditar={podeEditar} />
          <p className="mt-1.5 text-xs text-fg-subtle">
            {modo === "literal"
              ? "O e-mail sai exatamente com o texto abaixo."
              : "A IA usa o texto abaixo só como referência e escreve uma versão adaptada a cada envio."}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Corpo do e-mail</label>
          <Textarea
            rows={5}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder={CORPO_CONVITE_PADRAO}
            disabled={!podeEditar}
          />
        </div>
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

function IntervaloDiasCard({
  chave,
  titulo,
  descricao,
  valorInicial,
  podeEditar,
  onSalvo,
}: {
  chave: string;
  titulo: string;
  descricao: string;
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
      await apiPatch("/api/configuracoes", { chave, valor: intervaloDias });
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
          <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
          <p className="text-xs text-fg-subtle">{descricao}</p>
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
