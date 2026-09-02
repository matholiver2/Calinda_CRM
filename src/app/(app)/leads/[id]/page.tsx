"use client";

import { use, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  Tag,
  Calendar,
  UserCheck,
  FileText,
  StickyNote,
  Save,
  Folder,
  Upload,
  Download,
  Trash2,
  File as FileIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { ChatThread } from "@/components/features/ChatThread";
import { fetcher, apiPatch, apiPost, apiDelete, ApiError } from "@/lib/fetcher";
import { formatarTelefone, statusLabel, formatarTamanhoArquivo } from "@/lib/utils";
import type { Etapa, Lead } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COR: Record<string, string> = {
  ativo: "#3B82F6",
  cliente: "#10B981",
  perdido: "#EF4444",
  remarketing: "#A78BFA",
  finalizado: "#94A3B8",
};

type LeadDetalhe = Lead & {
  reunioes: { id: string; dataHora: string; status: string; resultado: string }[];
};

export default function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSWR<{ lead: LeadDetalhe }>(`/api/leads/${id}`, fetcher, {
    refreshInterval: 4000,
  });
  const { data: etapasData } = useSWR<{ etapas: Etapa[] }>("/api/etapas", fetcher);
  const [novaEtapa, setNovaEtapa] = useState("");

  const lead = data?.lead;
  const etapas = etapasData?.etapas ?? [];

  async function moverEtapa() {
    if (!novaEtapa || !lead) return;
    await apiPatch(`/api/leads/${id}/etapa`, { etapaId: novaEtapa });
    setNovaEtapa("");
    mutate(`/api/leads/${id}`);
    mutate("/api/leads");
  }

  async function marcarComoCliente() {
    if (!confirm("Marcar este lead como cliente? Ele passa a aparecer na carteira de Clientes.")) return;
    await apiPatch(`/api/leads/${id}`, { status: "cliente" });
    mutate(`/api/leads/${id}`);
    mutate("/api/leads");
  }

  if (isLoading || !lead) {
    return <div className="py-20 text-center text-sm text-fg-muted">Carregando lead...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar nome={lead.nome} size="lg" />
                <div>
                  <h1 className="text-lg font-bold text-fg">{lead.nome}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge color={lead.etapaAtual.cor}>{lead.etapaAtual.nome}</Badge>
                    <Badge color={STATUS_COR[lead.status]}>{statusLabel(lead.status)}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/orcamentos?leadId=${id}`}>
                  <Button variant="secondary" size="sm">
                    <FileText className="h-3.5 w-3.5" /> Criar orçamento
                  </Button>
                </Link>
                {lead.status !== "cliente" && (
                  <Button size="sm" onClick={marcarComoCliente}>
                    <UserCheck className="h-3.5 w-3.5" /> Marcar como Cliente
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="min-h-[420px] flex-1">
            <ChatThread leadId={id} />
          </div>
        </div>

        {/* Coluna lateral: dados */}
        <div className="space-y-4 overflow-y-auto">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Dados de contato</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-fg-muted">
                <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="font-mono">{formatarTelefone(lead.telefone)}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-fg-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="font-mono">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-fg-muted">
                <Tag className="h-3.5 w-3.5 shrink-0" /> {lead.origem}
              </div>
              <div className="flex items-center gap-2 text-fg-muted">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Entrou {formatDistanceToNow(new Date(lead.entrouEm), { addSuffix: true, locale: ptBR })}
              </div>
            </dl>
          </Card>

          <ObservacoesCard leadId={id} observacoesIniciais={lead.observacoes} />

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Vendedor responsável</h2>
            {lead.vendedor ? (
              <div className="flex items-center gap-2.5">
                <Avatar nome={lead.vendedor.nome} cor={lead.vendedor.avatarCor} size="sm" />
                <div>
                  <p className="text-sm font-medium text-fg">{lead.vendedor.nome}</p>
                  <p className="text-xs text-fg-subtle">{lead.vendedor.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-fg-subtle">Ainda não atribuído (IA conduzindo)</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-fg">Mover etapa manualmente</h2>
            <div className="space-y-2">
              <Select value={novaEtapa} onChange={(e) => setNovaEtapa(e.target.value)}>
                <option value="">Selecionar etapa...</option>
                {etapas
                  .filter((e) => e.id !== lead.etapaAtualId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
              </Select>
              <Button variant="secondary" className="w-full" disabled={!novaEtapa} onClick={moverEtapa}>
                Mover lead
              </Button>
            </div>
          </Card>

          {lead.reunioes.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-fg">Reuniões</h2>
              <div className="space-y-2">
                {lead.reunioes.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <p className="font-medium text-fg">
                      {format(new Date(r.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="mt-1 text-fg-subtle">
                      Status: {r.status} · Resultado: {r.resultado}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <ArquivosCard leadId={id} />
        </div>
      </div>
    </div>
  );
}

function ObservacoesCard({ leadId, observacoesIniciais }: { leadId: string; observacoesIniciais: string | null }) {
  const [texto, setTexto] = useState(observacoesIniciais ?? "");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    setSalvando(true);
    setSucesso(false);
    try {
      await apiPatch(`/api/leads/${leadId}`, { observacoes: texto });
      mutate(`/api/leads/${leadId}`);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 2000);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <StickyNote className="h-4 w-4 text-fg-subtle" /> Observações
      </h2>
      <p className="mb-3 text-xs text-fg-subtle">
        Histórico manual do cliente — útil pra leads sem conversa de WhatsApp pra IA acompanhar.
      </p>
      <Textarea
        rows={4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex.: cliente entrou em contato por indicação, já fizemos reunião e enviamos proposta..."
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {sucesso && <span className="text-xs text-success">Salvo.</span>}
        <Button variant="secondary" size="sm" loading={salvando} onClick={salvar}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>
    </Card>
  );
}

type ArquivoLead = { id: string; nome: string; tamanhoBytes: number; mimeType: string; criadoEm: string };

function ArquivosCard({ leadId }: { leadId: string }) {
  const chave = `/api/leads/${leadId}/arquivos`;
  const { data } = useSWR<{ pastaId: string; arquivos: ArquivoLead[] }>(chave, fetcher);
  const arquivos = data?.arquivos ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onEnviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !data) return;
    setErro(null);
    setEnviando(true);
    try {
      const { signedUrl, path } = await apiPost<{ signedUrl: string; path: string }>(
        "/api/arquivos/upload-assinado",
        { pastaId: data.pastaId, nomeArquivo: file.name }
      );
      const resUpload = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!resUpload.ok) throw new Error("Falha no upload do arquivo");

      await apiPost("/api/arquivos", {
        pastaId: data.pastaId,
        nome: file.name,
        storagePath: path,
        tamanhoBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      });
      mutate(chave);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao enviar arquivo");
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(arquivo: ArquivoLead) {
    const { url } = await fetcher<{ url: string }>(`/api/arquivos/${arquivo.id}`);
    window.open(url, "_blank");
  }

  async function remover(arquivo: ArquivoLead) {
    await apiDelete(`/api/arquivos/${arquivo.id}`);
    mutate(chave);
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Folder className="h-4 w-4 text-fg-subtle" /> Arquivos
        </h2>
        <Button variant="secondary" size="sm" loading={enviando} onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Enviar
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={onEnviarArquivo} />
      </div>

      {erro && <p className="mb-2 text-xs text-danger">{erro}</p>}

      {arquivos.length === 0 ? (
        <p className="text-sm text-fg-subtle">Nenhum arquivo ainda — envie contratos, propostas, apresentações...</p>
      ) : (
        <div className="space-y-1.5">
          {arquivos.map((arquivo) => (
            <div key={arquivo.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fg">{arquivo.nome}</p>
                  <p className="text-[10px] text-fg-subtle">{formatarTamanhoArquivo(arquivo.tamanhoBytes)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => baixar(arquivo)}
                  title="Baixar"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remover(arquivo)}
                  title="Apagar"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
