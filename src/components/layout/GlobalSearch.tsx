"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, File as FileIcon, CalendarDays, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Resultados = {
  leads: { id: string; nome: string; telefone: string; status: string }[];
  arquivos: { id: string; nome: string; pastaId: string; pasta: { nome: string } }[];
  reunioes: { id: string; dataHora: string; leadId: string; lead: { nome: string } }[];
};

const VAZIO: Resultados = { leads: [], arquivos: [], reunioes: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultados>(VAZIO);
  const [buscando, setBuscando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickFora);
      document.removeEventListener("keydown", onEsc);
    };
  }, [aberto]);

  useEffect(() => {
    if (termo.trim().length < 2) return;
    const timer = setTimeout(() => {
      setBuscando(true);
      fetcher<Resultados>(`/api/busca?q=${encodeURIComponent(termo.trim())}`)
        .then(setResultados)
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [termo]);

  function abrir() {
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function irPara(href: string) {
    setAberto(false);
    setTermo("");
    router.push(href);
  }

  async function abrirArquivo(id: string) {
    const { url } = await fetcher<{ url: string }>(`/api/arquivos/${id}`);
    setAberto(false);
    setTermo("");
    window.open(url, "_blank");
  }

  const temResultados = resultados.leads.length + resultados.arquivos.length + resultados.reunioes.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={abrir}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-fg-muted hover:bg-border"
      >
        <Search className="h-4 w-4" />
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-[72px] z-50 rounded-[14px] border border-border bg-bg-elevated shadow-[var(--shadow-float)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-96">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-fg-subtle" />
            <input
              ref={inputRef}
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar leads, clientes, arquivos, reuniões..."
              className="w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
            />
            {termo && (
              <button onClick={() => setTermo("")} className="shrink-0 text-fg-subtle hover:text-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {termo.trim().length < 2 ? (
              <p className="py-8 text-center text-sm text-fg-subtle">Digite ao menos 2 letras pra buscar.</p>
            ) : buscando ? (
              <p className="py-8 text-center text-sm text-fg-subtle">Buscando...</p>
            ) : !temResultados ? (
              <p className="py-8 text-center text-sm text-fg-subtle">Nenhum resultado pra &quot;{termo}&quot;.</p>
            ) : (
              <>
                {resultados.leads.length > 0 && (
                  <ResultGroup titulo="Leads e clientes">
                    {resultados.leads.map((l) => (
                      <ResultItem
                        key={l.id}
                        icon={User}
                        titulo={l.nome}
                        subtitulo={l.status === "cliente" ? "Cliente" : l.telefone}
                        onClick={() => irPara(`/leads/${l.id}`)}
                      />
                    ))}
                  </ResultGroup>
                )}
                {resultados.arquivos.length > 0 && (
                  <ResultGroup titulo="Arquivos">
                    {resultados.arquivos.map((a) => (
                      <ResultItem
                        key={a.id}
                        icon={FileIcon}
                        titulo={a.nome}
                        subtitulo={a.pasta.nome}
                        onClick={() => abrirArquivo(a.id)}
                      />
                    ))}
                  </ResultGroup>
                )}
                {resultados.reunioes.length > 0 && (
                  <ResultGroup titulo="Reuniões">
                    {resultados.reunioes.map((r) => (
                      <ResultItem
                        key={r.id}
                        icon={CalendarDays}
                        titulo={r.lead.nome}
                        subtitulo={new Date(r.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        onClick={() => irPara(`/leads/${r.leadId}`)}
                      />
                    ))}
                  </ResultGroup>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{titulo}</p>
      {children}
    </div>
  );
}

function ResultItem({
  icon: Icon,
  titulo,
  subtitulo,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  subtitulo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-fg-subtle" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">{titulo}</p>
        <p className="truncate text-xs text-fg-subtle">{subtitulo}</p>
      </div>
    </button>
  );
}
