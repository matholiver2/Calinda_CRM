"use client";

import { useRef, useState } from "react";
import useSWR, { mutate as mutateGlobal } from "swr";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, ImageUp, X, Building2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import { redimensionarLogo } from "@/lib/imagem";
import type { ModeloProposta, TemaProposta, EstiloFonte, SectionId } from "@/lib/propostaTipos";
import { SECOES_LABEL } from "@/lib/propostaTipos";

const TABS = [
  { id: "marca", label: "Marca & Tema" },
  { id: "capa", label: "Capa" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "metodo", label: "Método" },
  { id: "valuestack", label: "O que está incluso" },
  { id: "prova", label: "Prova Social" },
  { id: "investimento", label: "Investimento" },
  { id: "fechamento", label: "Fechamento" },
  { id: "secoes", label: "Seções do documento" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TEMAS: { id: TemaProposta; label: string; bg: string; accent: string }[] = [
  { id: "dark-gold", label: "Dark Gold", bg: "#0a0b0f", accent: "#d9a94a" },
  { id: "dark-indigo", label: "Dark Indigo", bg: "#08080f", accent: "#7075f0" },
  { id: "light-editorial", label: "Light Editorial", bg: "#f4f1ea", accent: "#a37918" },
  { id: "minimal-mono", label: "Minimal Mono", bg: "#0a0a0a", accent: "#ffffff" },
];

const FONTES: { id: EstiloFonte; label: string; amostra: string }[] = [
  { id: "moderno", label: "Moderno", amostra: "Helvetica" },
  { id: "classico", label: "Clássico", amostra: "Times New Roman" },
  { id: "mono", label: "Mono", amostra: "Courier" },
];

export function ModeloPropostaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, mutate } = useSWR<{ modelo: ModeloProposta }>(open ? "/api/configuracoes/proposta" : null, fetcher);
  return (
    <Dialog open={open} onClose={onClose} title="Editar modelo de proposta" maxWidth="max-w-4xl">
      {open && data && (
        <Formulario
          inicial={data.modelo}
          onSalvo={() => {
            mutate();
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function Formulario({ inicial, onSalvo }: { inicial: ModeloProposta; onSalvo: () => void }) {
  const [tab, setTab] = useState<TabId>("marca");
  const [modelo, setModelo] = useState<ModeloProposta>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPreVia, setGerandoPreVia] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof ModeloProposta>(key: K, valor: ModeloProposta[K]) {
    setModelo((m) => ({ ...m, [key]: valor }));
  }

  async function prever() {
    setErro(null);
    setGerandoPreVia(true);
    // Abre a aba já na hora do clique (síncrono) — esperar o fetch terminar
    // pra só então chamar window.open faria o navegador tratar como popup
    // não solicitado pelo usuário e bloquear.
    const aba = window.open("", "_blank");
    try {
      const res = await fetch("/api/configuracoes/proposta/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(modelo),
      });
      if (!res.ok) throw new Error("Erro ao gerar prévia");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (aba) aba.location.href = url;
      else window.open(url, "_blank");
    } catch {
      aba?.close();
      setErro("Erro ao gerar a prévia do modelo");
    } finally {
      setGerandoPreVia(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiPatch("/api/configuracoes/proposta", modelo);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-hover"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {tab === "marca" && <AbaMarca modelo={modelo} set={set} />}
        {tab === "capa" && <AbaCapa modelo={modelo} set={set} />}
        {tab === "diagnostico" && <AbaDiagnostico modelo={modelo} set={set} />}
        {tab === "metodo" && <AbaMetodo modelo={modelo} set={set} />}
        {tab === "valuestack" && <AbaValueStack modelo={modelo} set={set} />}
        {tab === "prova" && <AbaProva modelo={modelo} set={set} />}
        {tab === "investimento" && <AbaInvestimento modelo={modelo} set={set} />}
        {tab === "fechamento" && <AbaFechamento modelo={modelo} set={set} />}
        {tab === "secoes" && <AbaSecoes modelo={modelo} set={set} />}
      </div>

      {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <Button variant="secondary" onClick={prever} loading={gerandoPreVia}>
          <Eye className="h-3.5 w-3.5" /> Prévia
        </Button>
        <Button onClick={salvar} loading={salvando}>
          Salvar modelo
        </Button>
      </div>
    </div>
  );
}

type Setter = <K extends keyof ModeloProposta>(key: K, valor: ModeloProposta[K]) => void;

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-fg-muted">{label}</label>
      {children}
    </div>
  );
}

function AbaMarca({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-5">
      <LogoEmpresaCampo />

      <div>
        <p className="mb-2 text-xs font-medium text-fg-muted">Tema visual</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set("tema", t.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                modelo.tema === t.id ? "border-accent" : "border-border hover:border-border-strong"
              )}
              style={{ backgroundColor: t.bg }}
            >
              <div className="h-2 w-8 rounded-full" style={{ backgroundColor: t.accent }} />
              <p className="mt-2 text-[11px] font-medium" style={{ color: t.id === "light-editorial" ? "#17150f" : "#fff" }}>
                {t.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-fg-muted">Tipografia</p>
        <div className="grid grid-cols-3 gap-2">
          {FONTES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => set("fonte", f.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                modelo.fonte === f.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-hover"
              )}
            >
              <p className="text-xs font-semibold text-fg">{f.label}</p>
              <p className="text-[10px] text-fg-subtle">{f.amostra}</p>
            </button>
          ))}
        </div>
      </div>

      <Campo label="Cor de destaque">
        <input
          type="color"
          value={modelo.corDestaque}
          onChange={(e) => set("corDestaque", e.target.value)}
          className="h-10 w-full rounded-lg border border-border"
        />
      </Campo>

      <Campo label="Validade da proposta (dias)">
        <Input type="number" min={1} value={modelo.validadeDias} onChange={(e) => set("validadeDias", Number(e.target.value))} />
      </Campo>
    </div>
  );
}

function LogoEmpresaCampo() {
  const { data, mutate } = useSWR<{ usuario: { empresaAtiva: { nome: string; logoUrl: string | null } | null } }>(
    "/api/auth/me",
    fetcher
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const empresaAtiva = data?.usuario?.empresaAtiva;

  async function onSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const dataUrl = await redimensionarLogo(file);
      await apiPatch("/api/empresa/logo", { logoUrl: dataUrl });
      await mutate();
      mutateGlobal("/api/auth/me");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao enviar a logo");
    } finally {
      setEnviando(false);
    }
  }

  async function onRemover() {
    setEnviando(true);
    try {
      await apiDelete("/api/empresa/logo");
      await mutate();
      mutateGlobal("/api/auth/me");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao remover a logo");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-muted">Logo da empresa (aparece no cabeçalho do PDF)</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-hover">
          {empresaAtiva?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            <img src={empresaAtiva.logoUrl} alt={empresaAtiva.nome} className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <Building2 className="h-5 w-5 text-fg-subtle" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="sm" loading={enviando} onClick={() => logoInputRef.current?.click()}>
            <ImageUp className="h-3.5 w-3.5" /> Enviar logo
          </Button>
          {empresaAtiva?.logoUrl && (
            <button
              type="button"
              onClick={onRemover}
              disabled={enviando}
              className="flex items-center gap-1 text-xs font-medium text-fg-subtle hover:text-danger disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Remover logo
            </button>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onSelecionar} />
        </div>
      </div>
      {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
    </div>
  );
}

function AbaCapa({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-subtle">
        Use <code className="rounded bg-bg-elevated px-1 py-0.5">{"{nome}"}</code> e{" "}
        <code className="rounded bg-bg-elevated px-1 py-0.5">{"{empresa}"}</code> pra puxar o nome do cliente e da sua
        empresa automaticamente em cada proposta gerada.
      </p>
      <Campo label="Selo (eyebrow)">
        <Input value={modelo.capaEyebrow} onChange={(e) => set("capaEyebrow", e.target.value)} placeholder="Proposta comercial" />
      </Campo>
      <Campo label="Título de capa">
        <Textarea rows={2} value={modelo.capaHeadline} onChange={(e) => set("capaHeadline", e.target.value)} placeholder="O caminho para {empresa} evoluir, sem complicação." />
      </Campo>
      <Campo label="Subtítulo">
        <Textarea rows={2} value={modelo.capaSubtitle} onChange={(e) => set("capaSubtitle", e.target.value)} placeholder="Preparada especialmente para {nome}." />
      </Campo>
    </div>
  );
}

function AbaDiagnostico({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-4">
      <Campo label="Diagnóstico (o que está sendo resolvido)">
        <Textarea rows={4} value={modelo.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} placeholder="Hoje {empresa} perde tempo com processos manuais..." />
      </Campo>
      <Campo label="Custo mensal estimado (R$) — 0 desativa a projeção de 6/12 meses">
        <Input type="number" min={0} value={modelo.custoMensal} onChange={(e) => set("custoMensal", Number(e.target.value))} />
      </Campo>
    </div>
  );
}

function ListaEditavel({
  itens,
  onChange,
  placeholder,
}: {
  itens: { id: string; title: string }[];
  onChange: (itens: { id: string; title: string }[]) => void;
  placeholder: string;
}) {
  function add() {
    onChange([...itens, { id: `i-${Date.now()}`, title: "" }]);
  }
  function update(id: string, title: string) {
    onChange(itens.map((i) => (i.id === id ? { ...i, title } : i)));
  }
  function remove(id: string) {
    onChange(itens.filter((i) => i.id !== id));
  }
  return (
    <div className="space-y-1.5">
      {itens.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input value={item.title} onChange={(e) => update(item.id, e.target.value)} placeholder={placeholder} />
          <button type="button" onClick={() => remove(item.id)} className="shrink-0 text-fg-subtle hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Adicionar
      </Button>
    </div>
  );
}

function AbaMetodo({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-4">
      <Campo label="Nome do método">
        <Input value={modelo.metodoNome} onChange={(e) => set("metodoNome", e.target.value)} placeholder="Ex: Método Acelera" />
      </Campo>
      <Campo label="Introdução">
        <Textarea rows={3} value={modelo.metodoIntro} onChange={(e) => set("metodoIntro", e.target.value)} placeholder="A maioria tenta [abordagem comum] e falha porque [motivo]..." />
      </Campo>
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Pilares (chips numerados)</p>
        <ListaEditavel itens={modelo.metodoEtapas} onChange={(v) => set("metodoEtapas", v)} placeholder="Ex: Diagnóstico inicial" />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-muted">Marcos (linha do tempo)</p>
        <ListaEditavel itens={modelo.metodoMarcos} onChange={(v) => set("metodoMarcos", v)} placeholder="Ex: Semana 1 — Setup" />
      </div>
    </div>
  );
}

function AbaValueStack({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  function add() {
    set("deliverables", [...modelo.deliverables, { id: `d-${Date.now()}`, titulo: "", desc: "", valor: 0 }]);
  }
  function update(id: string, patch: Partial<ModeloProposta["deliverables"][number]>) {
    set("deliverables", modelo.deliverables.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    set("deliverables", modelo.deliverables.filter((it) => it.id !== id));
  }
  return (
    <div className="space-y-2">
      {modelo.deliverables.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2.5">
          <Input className="min-w-[140px] flex-1" value={d.titulo} onChange={(e) => update(d.id, { titulo: e.target.value })} placeholder="Título" />
          <Input className="min-w-[140px] flex-1" value={d.desc} onChange={(e) => update(d.id, { desc: e.target.value })} placeholder="Descrição curta" />
          <Input className="w-28" type="number" value={d.valor} onChange={(e) => update(d.id, { valor: Number(e.target.value) })} placeholder="Valor" />
          <label className="flex items-center gap-1 text-xs text-fg-muted">
            <input type="checkbox" checked={Boolean(d.bonus)} onChange={(e) => update(d.id, { bonus: e.target.checked })} />
            Bônus
          </label>
          <button type="button" onClick={() => remove(d.id)} className="text-fg-subtle hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {modelo.deliverables.length === 0 && <p className="text-xs text-fg-subtle">Nenhum item ainda.</p>}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Item
      </Button>
    </div>
  );
}

function AbaProva({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  function addDepoimento() {
    if (modelo.depoimentos.length >= 3) return;
    set("depoimentos", [...modelo.depoimentos, { id: `t-${Date.now()}`, nome: "", empresa: "", resultado: "", texto: "" }]);
  }
  function updateDepoimento(id: string, patch: Partial<ModeloProposta["depoimentos"][number]>) {
    set("depoimentos", modelo.depoimentos.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function removeDepoimento(id: string) {
    set("depoimentos", modelo.depoimentos.filter((d) => d.id !== id));
  }
  return (
    <div className="space-y-4">
      <Campo label="Bio do consultor/empresa">
        <Textarea rows={2} value={modelo.provaBio} onChange={(e) => set("provaBio", e.target.value)} />
      </Campo>
      <Campo label="Credenciais">
        <Input value={modelo.provaCredenciais} onChange={(e) => set("provaCredenciais", e.target.value)} placeholder="Ex: +10 anos de mercado, 200 clientes atendidos" />
      </Campo>
      <Campo label="Linha de métricas">
        <Input value={modelo.provaMetricas} onChange={(e) => set("provaMetricas", e.target.value)} placeholder="Ex: +120 projetos entregues, nota 4.9/5" />
      </Campo>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-medium text-fg-muted">Depoimentos (até 3)</p>
          {modelo.depoimentos.length < 3 && (
            <Button type="button" variant="secondary" size="sm" onClick={addDepoimento}>
              <Plus className="h-3.5 w-3.5" /> Depoimento
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {modelo.depoimentos.map((d) => (
            <div key={d.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <Input className="flex-1" value={d.nome} onChange={(e) => updateDepoimento(d.id, { nome: e.target.value })} placeholder="Nome" />
                <Input className="flex-1" value={d.empresa} onChange={(e) => updateDepoimento(d.id, { empresa: e.target.value })} placeholder="Empresa" />
                <button type="button" onClick={() => removeDepoimento(d.id)} className="shrink-0 text-fg-subtle hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input value={d.resultado} onChange={(e) => updateDepoimento(d.id, { resultado: e.target.value })} placeholder="Resultado curto (ex: 3x em 90 dias)" />
              <Textarea rows={2} value={d.texto} onChange={(e) => updateDepoimento(d.id, { texto: e.target.value })} placeholder="Depoimento" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AbaInvestimento({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-subtle">
        Valor, plano e periodicidade vêm automaticamente de cada orçamento — aqui só configura garantia e urgência,
        compartilhadas entre todas as propostas.
      </p>
      <Campo label="Garantia">
        <Textarea rows={2} value={modelo.garantia} onChange={(e) => set("garantia", e.target.value)} placeholder="Ex: 7 dias de garantia incondicional" />
      </Campo>
      <Campo label="Urgência">
        <Textarea rows={2} value={modelo.urgencia} onChange={(e) => set("urgencia", e.target.value)} placeholder="Ex: trabalhamos com no máximo 5 clientes novos por mês" />
      </Campo>
    </div>
  );
}

function AbaFechamento({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  return (
    <div className="space-y-4">
      <Campo label="Mensagem de fechamento">
        <Textarea rows={3} value={modelo.fechamento} onChange={(e) => set("fechamento", e.target.value)} />
      </Campo>
      <Campo label="Texto do CTA">
        <Input value={modelo.ctaTexto} onChange={(e) => set("ctaTexto", e.target.value)} placeholder="Aceitar proposta" />
      </Campo>
    </div>
  );
}

function AbaSecoes({ modelo, set }: { modelo: ModeloProposta; set: Setter }) {
  function mover(index: number, direcao: -1 | 1) {
    const novo = [...modelo.secoes];
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[index], novo[alvo]] = [novo[alvo], novo[index]];
    set("secoes", novo);
  }
  function alternar(id: SectionId) {
    set("secoes", modelo.secoes.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-subtle">
        A capa sempre aparece primeiro. Escolha a ordem e quais seções entram no PDF final.
      </p>
      <div className="space-y-1.5">
        {modelo.secoes.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={s.enabled} onChange={() => alternar(s.id)} />
              {SECOES_LABEL[s.id]}
            </label>
            <div className="flex items-center gap-1">
              <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === modelo.secoes.length - 1} onClick={() => mover(i, 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
