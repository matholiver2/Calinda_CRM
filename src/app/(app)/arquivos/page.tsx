"use client";

import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Folder,
  FolderPlus,
  ChevronLeft,
  Upload,
  Download,
  Trash2,
  Send,
  MessageCircle,
  Mail,
  File as FileIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { fetcher, apiPost, apiDelete, ApiError } from "@/lib/fetcher";
import { formatarTamanhoArquivo } from "@/lib/utils";
import type { Lead } from "@/types";

type Pasta = { id: string; nome: string; criadoEm: string; _count: { arquivos: number } };
type Arquivo = { id: string; nome: string; tamanhoBytes: number; mimeType: string; criadoEm: string };

export default function ArquivosPage() {
  const [pastaAtualId, setPastaAtualId] = useState<string | null>(null);
  const [novaPastaAberta, setNovaPastaAberta] = useState(false);

  const { data: pastasData } = useSWR<{ pastas: Pasta[] }>("/api/arquivos/pastas", fetcher);
  const pastas = pastasData?.pastas ?? [];
  const pastaAtual = pastas.find((p) => p.id === pastaAtualId) ?? null;

  if (pastaAtualId && pastaAtual) {
    return (
      <PastaView
        pasta={pastaAtual}
        onVoltar={() => setPastaAtualId(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Arquivos"
        description="Pastas com portfólio, produtos e materiais prontos pra enviar pro cliente"
        actions={
          <Button size="sm" onClick={() => setNovaPastaAberta(true)}>
            <FolderPlus className="h-3.5 w-3.5" /> Nova pasta
          </Button>
        }
      />

      {pastas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
          <Folder className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm font-medium text-fg">Nenhuma pasta criada ainda</p>
          <p className="text-xs text-fg-subtle">Crie pastas como Portfólio, Produtos ou Imagens.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pastas.map((pasta) => (
            <button key={pasta.id} onClick={() => setPastaAtualId(pasta.id)} className="text-left">
              <Card className="flex items-center gap-3 p-4 hover:bg-surface-hover">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{pasta.nome}</p>
                  <p className="text-xs text-fg-subtle">
                    {pasta._count.arquivos} arquivo{pasta._count.arquivos === 1 ? "" : "s"}
                  </p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <NovaPastaDialog open={novaPastaAberta} onClose={() => setNovaPastaAberta(false)} />
    </div>
  );
}

function NovaPastaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await apiPost("/api/arquivos/pastas", { nome });
      mutate("/api/arquivos/pastas");
      setNome("");
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar pasta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova pasta">
      <form onSubmit={criar} className="space-y-4">
        <Input
          autoFocus
          required
          placeholder="Ex: Portfólio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={loading}>
            Criar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PastaView({ pasta, onVoltar }: { pasta: Pasta; onVoltar: () => void }) {
  const chaveArquivos = `/api/arquivos?pastaId=${pasta.id}`;
  const { data } = useSWR<{ arquivos: Arquivo[] }>(chaveArquivos, fetcher);
  const arquivos = data?.arquivos ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivoParaEnviar, setArquivoParaEnviar] = useState<Arquivo | null>(null);

  async function onEnviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    setEnviando(true);
    try {
      const { signedUrl, path } = await apiPost<{ signedUrl: string; path: string }>(
        "/api/arquivos/upload-assinado",
        { pastaId: pasta.id, nomeArquivo: file.name }
      );
      const resUpload = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!resUpload.ok) throw new Error("Falha no upload do arquivo");

      await apiPost("/api/arquivos", {
        pastaId: pasta.id,
        nome: file.name,
        storagePath: path,
        tamanhoBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      });
      mutate(chaveArquivos);
      mutate("/api/arquivos/pastas");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao enviar arquivo");
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(arquivo: Arquivo) {
    const { url } = await fetcher<{ url: string }>(`/api/arquivos/${arquivo.id}`);
    window.open(url, "_blank");
  }

  async function remover(arquivo: Arquivo) {
    await apiDelete(`/api/arquivos/${arquivo.id}`);
    mutate(chaveArquivos);
    mutate("/api/arquivos/pastas");
  }

  return (
    <div>
      <PageHeader
        title={pasta.nome}
        description={`${arquivos.length} arquivo${arquivos.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={onVoltar}>
              <ChevronLeft className="h-3.5 w-3.5" /> Pastas
            </Button>
            <Button size="sm" loading={enviando} onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Enviar arquivo
            </Button>
            <input ref={inputRef} type="file" className="hidden" onChange={onEnviarArquivo} />
          </>
        }
      />

      {erro && <p className="mb-4 text-sm text-danger">{erro}</p>}

      {arquivos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-16 text-center">
          <FileIcon className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm font-medium text-fg">Nenhum arquivo nesta pasta</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {arquivos.map((arquivo) => (
            <div key={arquivo.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{arquivo.nome}</p>
                  <p className="text-xs text-fg-subtle">{formatarTamanhoArquivo(arquivo.tamanhoBytes)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setArquivoParaEnviar(arquivo)}
                  title="Encaminhar pro cliente"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  onClick={() => baixar(arquivo)}
                  title="Baixar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remover(arquivo)}
                  title="Apagar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <EnviarArquivoDialog arquivo={arquivoParaEnviar} onClose={() => setArquivoParaEnviar(null)} />
    </div>
  );
}

function EnviarArquivoDialog({ arquivo, onClose }: { arquivo: Arquivo | null; onClose: () => void }) {
  const { data: leadsData } = useSWR<{ leads: Lead[] }>(arquivo ? "/api/leads" : null, fetcher);
  const leads = leadsData?.leads ?? [];
  const [leadId, setLeadId] = useState("");
  const [enviandoCanal, setEnviandoCanal] = useState<"whatsapp" | "email" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const leadSelecionado = leads.find((l) => l.id === leadId) ?? null;

  async function enviar(canal: "whatsapp" | "email") {
    if (!arquivo || !leadId) return;
    setErro(null);
    setSucesso(null);
    setEnviandoCanal(canal);
    try {
      await apiPost(`/api/arquivos/${arquivo.id}/enviar-${canal}`, { leadId });
      setSucesso(canal === "whatsapp" ? "Enviado pelo WhatsApp!" : "Enviado por e-mail!");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao enviar arquivo");
    } finally {
      setEnviandoCanal(null);
    }
  }

  return (
    <Dialog open={!!arquivo} onClose={onClose} title={arquivo ? `Encaminhar "${arquivo.nome}"` : ""}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Cliente</label>
          <Select
            value={leadId}
            onChange={(e) => {
              setLeadId(e.target.value);
              setErro(null);
              setSucesso(null);
            }}
          >
            <option value="">Selecionar...</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        {sucesso && <p className="text-sm text-success">{sucesso}</p>}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!leadId}
            loading={enviandoCanal === "whatsapp"}
            onClick={() => enviar("whatsapp")}
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!leadId || !leadSelecionado?.email}
            title={leadSelecionado && !leadSelecionado.email ? "Este cliente não tem e-mail cadastrado" : undefined}
            loading={enviandoCanal === "email"}
            onClick={() => enviar("email")}
          >
            <Mail className="h-3.5 w-3.5" /> E-mail
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
