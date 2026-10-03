"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Target,
  MapPin,
  Rocket,
  Loader2,
  KeyRound,
  Download,
  Star,
  Phone,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { fetcher, apiPost, apiPatch, ApiError } from "@/lib/fetcher";

type LeadProspectado = {
  nome: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  site: string | null;
  avaliacao: number | null;
  totalAvaliacoes: number | null;
  googleUrl: string | null;
};

export default function ProspeccaoPage() {
  const { data: configData, mutate: mutateConfig } = useSWR<{ configurado: boolean }>(
    "/api/prospeccao/config",
    fetcher
  );
  const [dialogToken, setDialogToken] = useState(false);

  const [nicho, setNicho] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [maxResultados, setMaxResultados] = useState(50);
  const [somenteComTelefone, setSomenteComTelefone] = useState(true);
  const [somenteComSite, setSomenteComSite] = useState(false);
  const [somenteSemSite, setSomenteSemSite] = useState(false);

  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadProspectado[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState<string | null>(null);

  const configurado = configData?.configurado ?? null;

  async function buscar() {
    if (!nicho.trim() || !localizacao.trim()) {
      setErro("Preencha nicho e localização");
      return;
    }
    if (configurado === false) {
      setDialogToken(true);
      return;
    }
    setErro(null);
    setBuscando(true);
    setLeads([]);
    setSelecionados(new Set());
    setResultadoImportacao(null);
    try {
      const { runId } = await apiPost<{ runId: string }>("/api/prospeccao/buscar", {
        nicho: nicho.trim(),
        localizacao: localizacao.trim(),
        maxResultados,
      });
      await aguardarResultado(runId);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao buscar leads");
      setBuscando(false);
    }
  }

  async function aguardarResultado(runId: string) {
    const params = new URLSearchParams({ runId });
    if (somenteComTelefone) params.set("somenteComTelefone", "1");
    if (somenteComSite) params.set("somenteComSite", "1");
    if (somenteSemSite) params.set("somenteSemSite", "1");

    for (let tentativa = 0; tentativa < 90; tentativa++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const data = await fetcher<{ status: string; leads: LeadProspectado[] | null; erro?: string }>(
          `/api/prospeccao/status?${params.toString()}`
        );
        if (data.status === "SUCCEEDED" && data.leads) {
          setLeads(data.leads);
          setBuscando(false);
          return;
        }
        if (["FAILED", "ABORTED", "TIMED-OUT"].includes(data.status)) {
          setErro("A busca falhou na Apify. Tente novamente.");
          setBuscando(false);
          return;
        }
      } catch (err) {
        setErro(err instanceof ApiError ? err.message : "Erro ao consultar a busca");
        setBuscando(false);
        return;
      }
    }
    setErro("Tempo esgotado aguardando a busca.");
    setBuscando(false);
  }

  function alternar(i: number) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function alternarTodos() {
    setSelecionados((s) => (s.size === leads.length ? new Set() : new Set(leads.map((_, i) => i))));
  }

  async function importar() {
    const paraImportar = (selecionados.size > 0 ? [...selecionados] : leads.map((_, i) => i)).map((i) => leads[i]);
    if (paraImportar.length === 0) return;
    setImportando(true);
    try {
      const resultado = await apiPost<{ importados: number; duplicados: number; semTelefone: number }>(
        "/api/prospeccao/importar",
        {
          leads: paraImportar.map((l) => ({ nome: l.nome, telefone: l.telefone, endereco: l.endereco })),
        }
      );
      setResultadoImportacao(
        `${resultado.importados} lead(s) importado(s)${resultado.duplicados ? `, ${resultado.duplicados} já existia(m)` : ""}${
          resultado.semTelefone ? `, ${resultado.semTelefone} sem telefone (ignorado)` : ""
        }.`
      );
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao importar");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-fg">
          <Target className="h-5 w-5 text-accent" /> Prospecção de leads
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Busque leads novos no Google Maps por nicho e localização, e importe direto pro funil.
        </p>
      </div>

      <TokenDialog
        open={dialogToken}
        onClose={() => setDialogToken(false)}
        onSaved={() => {
          mutateConfig();
          setDialogToken(false);
        }}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nicho / categoria</label>
            <Input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Ex: dentistas, restaurantes" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">Localização</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex: Curitiba, PR"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-fg-muted">
              Quantidade de resultados <span className="font-bold text-accent">{maxResultados}</span>
            </label>
            <input
              type="range"
              min={10}
              max={300}
              step={10}
              value={maxResultados}
              onChange={(e) => setMaxResultados(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2 text-sm text-fg-muted">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={somenteComTelefone} onChange={(e) => setSomenteComTelefone(e.target.checked)} />
              Só com telefone
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={somenteComSite}
                onChange={(e) => {
                  setSomenteComSite(e.target.checked);
                  if (e.target.checked) setSomenteSemSite(false);
                }}
              />
              Só com site
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={somenteSemSite}
                onChange={(e) => {
                  setSomenteSemSite(e.target.checked);
                  if (e.target.checked) setSomenteComSite(false);
                }}
              />
              Só SEM site
            </label>
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <Button className="w-full" onClick={buscar} loading={buscando}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {buscando ? "Buscando..." : "Buscar leads"}
          </Button>

          {configurado === false && (
            <Button variant="secondary" className="w-full" onClick={() => setDialogToken(true)}>
              <KeyRound className="h-3.5 w-3.5" /> Configurar Apify
            </Button>
          )}
        </Card>

        <div>
          {buscando && leads.length === 0 && (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
              <p className="mt-3 text-sm text-fg-muted">
                Buscando no Google Maps... pode levar alguns minutos.
              </p>
            </Card>
          )}

          {!buscando && leads.length === 0 && (
            <Card className="p-12 text-center">
              <Target className="mx-auto h-8 w-8 text-fg-subtle" />
              <p className="mt-3 text-sm text-fg-muted">Preencha os filtros e busque leads novos.</p>
            </Card>
          )}

          {leads.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-fg">{leads.length} leads encontrados</p>
                  <p className="text-xs text-fg-subtle">
                    {selecionados.size > 0 ? `${selecionados.size} selecionados` : "Nenhum selecionado (importa todos)"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={alternarTodos}>
                    {selecionados.size === leads.length ? "Limpar seleção" : "Selecionar todos"}
                  </Button>
                  <Button size="sm" onClick={importar} loading={importando}>
                    <Download className="h-3.5 w-3.5" /> Importar como leads
                  </Button>
                </div>
              </div>

              {resultadoImportacao && (
                <p className="mb-3 flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> {resultadoImportacao}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {leads.map((l, i) => (
                  <div key={i} onClick={() => alternar(i)} role="button" tabIndex={0}>
                  <Card
                    className={`cursor-pointer p-3.5 transition-colors ${
                      selecionados.has(i) ? "border-accent bg-accent-soft/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-fg">{l.nome}</p>
                      {l.avaliacao != null && (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-fg-muted">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {l.avaliacao.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {l.categoria && <p className="text-xs text-fg-subtle">{l.categoria}</p>}
                    <div className="mt-1.5 space-y-0.5 text-xs text-fg-muted">
                      {l.telefone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {l.telefone}
                        </p>
                      )}
                      {l.site && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Globe className="h-3 w-3 shrink-0" /> {l.site.replace(/^https?:\/\//, "")}
                        </p>
                      )}
                    </div>
                  </Card>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!token.trim()) return setErro("Cole seu token da Apify");
    setSalvando(true);
    setErro(null);
    try {
      await apiPatch("/api/prospeccao/config", { token: token.trim() });
      setToken("");
      onSaved();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao salvar token");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Conectar sua conta Apify">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          A prospecção usa a <strong>Apify</strong> pra extrair leads do Google Maps. Crie uma conta gratuita em{" "}
          <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            console.apify.com
          </a>
          , copie sua Personal API token em Settings → API &amp; Integrations, e cole abaixo.
        </p>
        <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="apify_api_..." />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <Button className="w-full" onClick={salvar} loading={salvando}>
          <KeyRound className="h-3.5 w-3.5" /> Validar e salvar
        </Button>
      </div>
    </Dialog>
  );
}
