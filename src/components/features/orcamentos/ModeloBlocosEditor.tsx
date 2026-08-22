"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  X,
  Save,
  Bold,
  Italic,
  Underline,
  Type,
  ImagePlus,
  Trash2,
  GripVertical,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetcher, apiPatch, ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { parseLinhasModelo, textoLegadoParaLinhas, type BlocoConteudo, type LinhaModelo } from "@/lib/orcamentoModelo";

const IMAGEM_LARGURA_MAX_PX = 700;

function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function redimensionarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, IMAGEM_LARGURA_MAX_PX / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponível"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

const DRAG_TIPO_NOVO = "application/x-calinda-novo-bloco";
const DRAG_ORIGEM_EXISTENTE = "application/x-calinda-origem-bloco"; // "linhaIndice:itemIndice"

type MeuUsuario = {
  empresa: { nome: string; logoUrl: string | null } | null;
  empresaAtiva: { nome: string; logoUrl: string | null } | null;
};

/** Onde um bloco (novo ou movido) deve cair: numa linha nova, ou como item ao lado de uma linha existente. */
type Alvo = { tipo: "linha-nova"; indice: number } | { tipo: "item-em-linha"; linhaIndice: number; posicao: "inicio" | "fim" };

export function ModeloBlocosEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useSWR<{ configuracoes: Record<string, string> }>(open ? "/api/configuracoes" : null, fetcher);
  const { data: meData } = useSWR<{ usuario: MeuUsuario }>(open ? "/api/auth/me" : null, fetcher);
  const [linhas, setLinhas] = useState<LinhaModelo[]>([]);
  const [carregou, setCarregou] = useState(false);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const corpoRef = useRef<HTMLDivElement>(null);

  if (open && data && !carregou) {
    const brutos = data.configuracoes.orcamento_modelo_blocos;
    const legado = data.configuracoes.orcamento_texto_padrao;
    setLinhas(brutos ? parseLinhasModelo(brutos) : legado ? textoLegadoParaLinhas(legado) : []);
    setCarregou(true);
  }
  if (!open && carregou) {
    setCarregou(false);
    setErro(null);
    setSucesso(false);
  }

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  function inserirNovoItem(item: BlocoConteudo, destino: Alvo) {
    setLinhas((atual) => {
      const copia = atual.map((l) => ({ ...l, itens: [...l.itens] }));
      if (destino.tipo === "linha-nova") {
        copia.splice(destino.indice, 0, { id: novoId("linha"), itens: [item] });
      } else {
        const linha = copia[destino.linhaIndice];
        if (destino.posicao === "inicio") linha.itens.unshift(item);
        else linha.itens.push(item);
      }
      return copia;
    });
  }

  function moverItemExistente(origemLinha: number, origemItem: number, destino: Alvo) {
    setLinhas((atual) => {
      const copia = atual.map((l) => ({ ...l, itens: [...l.itens] }));
      const [item] = copia[origemLinha].itens.splice(origemItem, 1);
      const linhaFicouVazia = copia[origemLinha].itens.length === 0;
      if (linhaFicouVazia) copia.splice(origemLinha, 1);

      // ajusta índices do destino se a linha de origem foi removida antes dele
      const ajuste = linhaFicouVazia && origemLinha < (destino.tipo === "linha-nova" ? destino.indice : destino.linhaIndice) ? 1 : 0;

      if (destino.tipo === "linha-nova") {
        copia.splice(destino.indice - ajuste, 0, { id: novoId("linha"), itens: [item] });
      } else {
        const linha = copia[destino.linhaIndice - ajuste];
        if (destino.posicao === "inicio") linha.itens.unshift(item);
        else linha.itens.push(item);
      }
      return copia;
    });
  }

  function atualizarItem(linhaId: string, itemId: string, mudanca: Partial<BlocoConteudo>) {
    setLinhas((atual) =>
      atual.map((l) =>
        l.id !== linhaId ? l : { ...l, itens: l.itens.map((it) => (it.id === itemId ? ({ ...it, ...mudanca } as BlocoConteudo) : it)) }
      )
    );
  }

  function removerItem(linhaId: string, itemId: string) {
    setLinhas((atual) =>
      atual
        .map((l) => (l.id !== linhaId ? l : { ...l, itens: l.itens.filter((it) => it.id !== itemId) }))
        .filter((l) => l.itens.length > 0)
    );
  }

  /** Compara a posição do mouse com as linhas já na folha pra decidir: nova linha, ou lado a lado numa existente. */
  function calcularAlvo(clientX: number, clientY: number): Alvo {
    const linhasEls = corpoRef.current?.querySelectorAll<HTMLElement>("[data-linha-indice]");
    if (!linhasEls || linhasEls.length === 0) return { tipo: "linha-nova", indice: 0 };

    for (const el of Array.from(linhasEls)) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const meioX = rect.left + rect.width / 2;
        return {
          tipo: "item-em-linha",
          linhaIndice: Number(el.dataset.linhaIndice),
          posicao: clientX < meioX ? "inicio" : "fim",
        };
      }
    }

    for (const el of Array.from(linhasEls)) {
      const rect = el.getBoundingClientRect();
      const meioY = rect.top + rect.height / 2;
      if (clientY < meioY) return { tipo: "linha-nova", indice: Number(el.dataset.linhaIndice) };
    }
    return { tipo: "linha-nova", indice: linhasEls.length };
  }

  function onDragOverFolha(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setAlvo(calcularAlvo(e.clientX, e.clientY));
  }

  function onDropNaFolha(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const destino = calcularAlvo(e.clientX, e.clientY);
    const tipoNovo = e.dataTransfer.getData(DRAG_TIPO_NOVO);
    const origem = e.dataTransfer.getData(DRAG_ORIGEM_EXISTENTE);

    if (tipoNovo === "paragrafo") {
      inserirNovoItem({ id: novoId("item"), tipo: "paragrafo", html: "Escreva aqui..." }, destino);
    } else if (tipoNovo === "imagem") {
      inserirNovoItem({ id: novoId("item"), tipo: "imagem", dataUrl: "" }, destino);
    } else if (origem) {
      const [origemLinha, origemItem] = origem.split(":").map(Number);
      moverItemExistente(origemLinha, origemItem, destino);
    }
    setAlvo(null);
  }

  async function salvar() {
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      await apiPatch("/api/configuracoes", { chave: "orcamento_modelo_blocos", valor: JSON.stringify(linhas) });
      setSucesso(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar modelo");
    } finally {
      setSalvando(false);
    }
  }

  const empresa = meData?.usuario?.empresaAtiva ?? meData?.usuario?.empresa ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border bg-bg-elevated px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-fg">Editar modelo de orçamento</p>
          <p className="text-xs text-fg-subtle">
            Arraste os blocos da direita pra montar o conteúdo — solte na lateral de um bloco existente pra deixar lado a lado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {erro && <p className="text-sm text-danger">{erro}</p>}
          {sucesso && <p className="text-sm text-success">Salvo.</p>}
          <Button size="sm" loading={salvando} onClick={salvar}>
            <Save className="h-3.5 w-3.5" /> Salvar modelo
          </Button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden bg-bg p-6">
        {/* Folha */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto min-h-[1123px] w-full max-w-[794px] rounded-[4px] bg-white p-16 shadow-[var(--shadow-float)]">
            {/* Cabeçalho fixo — igual ao que sai no PDF, não é editável aqui */}
            <div className="mb-10 flex items-start justify-between border-b-2 border-[#217940] pb-4">
              <div>
                {empresa?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL
                  <img src={empresa.logoUrl} alt={empresa.nome} className="mb-1.5 h-10 w-auto max-w-[160px] object-contain" />
                )}
                <p className={empresa?.logoUrl ? "text-sm font-bold text-neutral-900" : "text-xl font-bold text-[#217940]"}>
                  {empresa?.nome ?? "Sua empresa"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-neutral-900">Orçamento</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            <div
              ref={corpoRef}
              onDragOver={onDragOverFolha}
              onDrop={onDropNaFolha}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null);
              }}
              className="min-h-[400px]"
            >
              {linhas.length === 0 && (
                <div
                  className={cn(
                    "flex h-40 items-center justify-center rounded-[10px] border-2 border-dashed text-sm transition-colors",
                    alvo ? "border-accent bg-accent-soft text-accent" : "border-neutral-200 text-neutral-400"
                  )}
                >
                  Arraste um bloco de texto ou imagem aqui
                </div>
              )}

              {linhas.map((linha, li) => (
                <div key={linha.id}>
                  <LinhaInsercao ativo={alvo?.tipo === "linha-nova" && alvo.indice === li} />
                  <div data-linha-indice={li} className="flex gap-4">
                    {linha.itens.map((item, ii) => (
                      <div
                        key={item.id}
                        className={cn(
                          "min-w-0 flex-1 transition-[outline]",
                          alvo?.tipo === "item-em-linha" && alvo.linhaIndice === li && "outline outline-2 outline-accent/40 rounded-[8px]"
                        )}
                      >
                        <BlocoItem
                          item={item}
                          onAtualizar={(mudanca) => atualizarItem(linha.id, item.id, mudanca)}
                          onRemover={() => removerItem(linha.id, item.id)}
                          onDragStartExistente={(e) => e.dataTransfer.setData(DRAG_ORIGEM_EXISTENTE, `${li}:${ii}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {linhas.length > 0 && <LinhaInsercao ativo={alvo?.tipo === "linha-nova" && alvo.indice === linhas.length} />}
            </div>
          </div>
        </div>

        {/* Paleta de blocos */}
        <div className="w-64 shrink-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Blocos</p>
          <div
            draggable
            onDragStart={(e) => e.dataTransfer.setData(DRAG_TIPO_NOVO, "paragrafo")}
            className="flex cursor-grab items-center gap-2.5 rounded-[12px] border border-border bg-surface p-3.5 text-sm font-medium text-fg shadow-[var(--shadow-card)] active:cursor-grabbing"
          >
            <Type className="h-4 w-4 text-fg-subtle" /> Parágrafo de texto
          </div>
          <div
            draggable
            onDragStart={(e) => e.dataTransfer.setData(DRAG_TIPO_NOVO, "imagem")}
            className="flex cursor-grab items-center gap-2.5 rounded-[12px] border border-border bg-surface p-3.5 text-sm font-medium text-fg shadow-[var(--shadow-card)] active:cursor-grabbing"
          >
            <ImagePlus className="h-4 w-4 text-fg-subtle" /> Imagem
          </div>
          <p className="pt-2 text-xs text-fg-subtle">
            Solte no meio (entre duas linhas) pra empilhar, ou na metade esquerda/direita de um bloco já criado pra ficar
            lado a lado. Passe o mouse sobre um bloco pra formatar ou arrastar pelo ícone{" "}
            <GripVertical className="inline h-3 w-3" />.
          </p>
        </div>
      </div>
    </div>
  );
}

function LinhaInsercao({ ativo }: { ativo: boolean }) {
  return (
    <div className={cn("transition-all", ativo ? "h-3" : "h-1")}>
      {ativo && <div className="h-0.5 rounded-full bg-accent" />}
    </div>
  );
}

function BlocoItem({
  item,
  onAtualizar,
  onRemover,
  onDragStartExistente,
}: {
  item: BlocoConteudo;
  onAtualizar: (mudanca: Partial<BlocoConteudo>) => void;
  onRemover: () => void;
  onDragStartExistente: (e: React.DragEvent) => void;
}) {
  return (
    <div className="group relative mb-1 rounded-[8px] hover:bg-neutral-50">
      <div className="absolute -left-7 top-1 hidden items-center gap-1 group-hover:flex">
        <div draggable onDragStart={onDragStartExistente} className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute right-1 top-1 hidden group-hover:flex">
        <button onClick={onRemover} title="Remover bloco" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-neutral-300 hover:bg-danger/10 hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {item.tipo === "paragrafo" ? (
        <ParagrafoBloco html={item.html} onChange={(html) => onAtualizar({ html })} />
      ) : (
        <ImagemBloco
          dataUrl={item.dataUrl}
          larguraPct={item.larguraPct ?? 100}
          onChangeDataUrl={(dataUrl) => onAtualizar({ dataUrl })}
          onChangeLargura={(larguraPct) => onAtualizar({ larguraPct })}
        />
      )}
    </div>
  );
}

function ParagrafoBloco({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (ref.current && primeiraRenderizacao.current) {
      ref.current.innerHTML = html;
      primeiraRenderizacao.current = false;
    }
  }, [html]);

  function aplicar(comando: "bold" | "italic" | "underline") {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      // navegador não suporta — segue com o padrão dele mesmo
    }
    document.execCommand(comando);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="rounded-[8px] px-2 py-1.5">
      <div className="mb-1 hidden gap-1 group-hover:flex">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("bold")} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200">
          <Bold className="h-3 w-3" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("italic")} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200">
          <Italic className="h-3 w-3" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar("underline")} className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200">
          <Underline className="h-3 w-3" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[1.6em] text-sm leading-relaxed text-neutral-900 outline-none"
      />
    </div>
  );
}

const LARGURA_MIN_PCT = 15;
const LARGURA_MAX_PCT = 100;

function ImagemBloco({
  dataUrl,
  larguraPct,
  onChangeDataUrl,
  onChangeLargura,
}: {
  dataUrl: string;
  larguraPct: number;
  onChangeDataUrl: (dataUrl: string) => void;
  onChangeLargura: (larguraPct: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [redimensionando, setRedimensionando] = useState(false);

  async function onSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem");
      return;
    }
    setErro(null);
    try {
      onChangeDataUrl(await redimensionarImagem(file));
    } catch {
      setErro("Erro ao processar a imagem");
    }
  }

  function iniciarRedimensionamento(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const container = wrapperRef.current?.parentElement; // % é relativa ao espaço desse item na linha
    if (!container) return;
    const larguraContainer = container.getBoundingClientRect().width;
    const xInicial = e.clientX;
    const larguraInicialPct = larguraPct;
    setRedimensionando(true);

    function onMove(ev: PointerEvent) {
      const deltaPx = ev.clientX - xInicial;
      const deltaPct = (deltaPx / larguraContainer) * 100;
      const nova = Math.min(LARGURA_MAX_PCT, Math.max(LARGURA_MIN_PCT, Math.round(larguraInicialPct + deltaPct)));
      onChangeLargura(nova);
    }
    function onUp() {
      setRedimensionando(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!dataUrl) {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-28 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-neutral-200 text-sm text-neutral-400 hover:border-neutral-300"
      >
        <ImagePlus className="h-4 w-4" /> Clique pra enviar uma imagem
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelecionar} />
        {erro && <span className="text-danger">{erro}</span>}
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className="relative inline-block py-1.5" style={{ width: `${larguraPct}%` }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
      <img src={dataUrl} alt="" className="max-h-64 w-full rounded-[8px] object-contain" draggable={false} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-3 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-black/75 group-hover:opacity-100"
      >
        Trocar imagem
      </button>
      <div
        onPointerDown={iniciarRedimensionamento}
        title="Arraste pra redimensionar"
        className={cn(
          "absolute bottom-1.5 right-1.5 flex h-4 w-4 cursor-nwse-resize items-center justify-center rounded-sm bg-accent opacity-0 transition-opacity group-hover:opacity-100",
          redimensionando && "opacity-100"
        )}
      >
        <Move className="h-2.5 w-2.5 text-accent-foreground" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelecionar} />
    </div>
  );
}
