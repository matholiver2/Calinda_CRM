"use client";

import { useRef, useState } from "react";
import { mutate } from "swr";
import { Upload, Download, Bot, BotOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/fetcher";
import { parsearCsv, mapearLinhasParaLeads, gerarCsvModelo, type LeadParaImportar } from "@/lib/csvImport";

export function ImportarPlanilhaDialog({
  open,
  onClose,
  statusAlvo,
  chaveSwr,
}: {
  open: boolean;
  onClose: () => void;
  /** "ativo" pra importar como leads novos (entram no funil normal), "cliente" pra subir a carteira já existente. */
  statusAlvo: "ativo" | "cliente";
  /** Chave(s) SWR pra invalidar depois de importar. */
  chaveSwr: string | string[];
}) {
  return (
    <Dialog open={open} onClose={onClose} title={statusAlvo === "cliente" ? "Importar clientes de planilha" : "Importar leads de planilha"} maxWidth="max-w-lg">
      {open && <ImportarForm onClose={onClose} statusAlvo={statusAlvo} chaveSwr={chaveSwr} />}
    </Dialog>
  );
}

function baixarModelo() {
  const blob = new Blob([gerarCsvModelo()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-importacao.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ImportarForm({
  onClose,
  statusAlvo,
  chaveSwr,
}: {
  onClose: () => void;
  statusAlvo: "ativo" | "cliente";
  chaveSwr: string | string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [validos, setValidos] = useState<LeadParaImportar[]>([]);
  const [semNome, setSemNome] = useState(0);
  const [semTelefone, setSemTelefone] = useState(0);
  const [iniciarComIa, setIniciarComIa] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number; duplicados: number; invalidos: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setResultado(null);
    setNomeArquivo(arquivo.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const texto = String(reader.result ?? "");
        const linhas = parsearCsv(texto);
        const { validos: v, semNome: sn, semTelefone: st } = mapearLinhasParaLeads(linhas);
        setValidos(v);
        setSemNome(sn);
        setSemTelefone(st);
        if (v.length === 0) setErro("Nenhuma linha válida encontrada — confira se a planilha tem colunas de nome e telefone.");
      } catch {
        setErro("Não consegui ler esse arquivo. Confira se é um CSV válido.");
      }
    };
    reader.readAsText(arquivo, "utf-8");
  }

  async function importar() {
    if (validos.length === 0) return;
    setImportando(true);
    setErro(null);
    try {
      const resp = await apiPost<{ importados: number; duplicados: number; invalidos: number }>("/api/leads/importar", {
        leads: validos,
        status: statusAlvo,
        iniciarComIa,
      });
      setResultado(resp);
      const chaves = Array.isArray(chaveSwr) ? chaveSwr : [chaveSwr];
      chaves.forEach((k) => mutate(k));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao importar a planilha");
    } finally {
      setImportando(false);
    }
  }

  if (resultado) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <div>
          <p className="text-sm font-semibold text-fg">{resultado.importados} importado(s) com sucesso</p>
          {resultado.duplicados > 0 && <p className="text-xs text-fg-subtle">{resultado.duplicados} já existia(m) (telefone repetido) — ignorado(s)</p>}
          {resultado.invalidos > 0 && <p className="text-xs text-fg-subtle">{resultado.invalidos} linha(s) inválida(s) — ignorada(s)</p>}
        </div>
        <Button onClick={onClose} className="w-full">
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-subtle">
        Envie um arquivo CSV com pelo menos as colunas <strong>nome</strong> e <strong>telefone</strong> (email, origem,
        endereço e observações são opcionais). Se sua planilha é .xlsx, exporte/salve como CSV antes (Excel/Sheets:
        Arquivo → Salvar como → CSV).
      </p>

      <button
        type="button"
        onClick={baixarModelo}
        className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover"
      >
        <Download className="h-3.5 w-3.5" /> Baixar modelo CSV
      </button>

      <div>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onArquivoSelecionado} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border px-4 py-8 text-sm text-fg-muted hover:border-accent hover:text-accent"
        >
          <Upload className="h-6 w-6" />
          {nomeArquivo ? nomeArquivo : "Clique pra escolher o arquivo CSV"}
        </button>
      </div>

      {erro && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erro}
        </p>
      )}

      {validos.length > 0 && (
        <>
          <div className="rounded-lg bg-surface-hover p-3 text-xs text-fg-muted">
            <p>
              <strong className="text-fg">{validos.length}</strong> linha(s) prontas pra importar
              {semNome > 0 && `, ${semNome} sem nome (ignorada)`}
              {semTelefone > 0 && `, ${semTelefone} sem telefone (ignorada)`}.
            </p>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-fg-subtle">
                  <th className="px-2.5 py-1.5 font-medium">Nome</th>
                  <th className="px-2.5 py-1.5 font-medium">Telefone</th>
                  <th className="px-2.5 py-1.5 font-medium">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {validos.slice(0, 8).map((l, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="truncate px-2.5 py-1.5 text-fg">{l.nome}</td>
                    <td className="px-2.5 py-1.5 text-fg-muted">{l.telefone}</td>
                    <td className="truncate px-2.5 py-1.5 text-fg-muted">{l.endereco ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validos.length > 8 && <p className="px-2.5 py-1.5 text-[11px] text-fg-subtle">+ {validos.length - 8} outra(s)</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg-muted">IA no WhatsApp</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIniciarComIa(false)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2 text-sm transition-colors ${
                  !iniciarComIa ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
                }`}
              >
                <BotOff className="h-3.5 w-3.5" /> Não enviar nada
              </button>
              <button
                type="button"
                onClick={() => setIniciarComIa(true)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2 text-sm transition-colors ${
                  iniciarComIa ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"
                }`}
              >
                <Bot className="h-3.5 w-3.5" /> Mandar primeira mensagem
              </button>
            </div>
            <p className="mt-1.5 text-xs text-fg-subtle">
              {iniciarComIa
                ? `A IA manda a primeira mensagem pra todos os ${validos.length} importados assim que a importação terminar.`
                : "Nenhuma mensagem é enviada — os contatos só ficam cadastrados (recomendado pra planilhas de clientes/contatos já existentes, sem opt-in recente)."}
            </p>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={importar} loading={importando} disabled={validos.length === 0}>
          Importar {validos.length > 0 ? validos.length : ""}
        </Button>
      </div>
    </div>
  );
}
