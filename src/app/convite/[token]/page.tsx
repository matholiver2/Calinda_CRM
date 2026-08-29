"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { fetcher, apiPost, ApiError } from "@/lib/fetcher";
import { papelLabel } from "@/lib/utils";

type ConviteInfo = {
  email: string;
  papel: string;
  empresaNome: string | null;
  status: "pendente" | "aceito" | "expirado" | "revogado";
  contaExistente: boolean;
};

export default function AceitarConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, error, isLoading } = useSWR<ConviteInfo>(`/api/convites/publico/${token}`, fetcher);
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contaExistente = data?.contaExistente ?? false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!contaExistente && senha !== confirmar) {
      setErro("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await apiPost(`/api/convites/publico/${token}/aceitar`, contaExistente ? { senha } : { nome, senha });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao aceitar convite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" className="mb-3 shadow-lg shadow-accent/25" />
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-fg">CALINDA</h1>
          <p className="mt-1 text-sm text-fg-muted">Você foi convidado</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
          {isLoading && <p className="text-center text-sm text-fg-muted">Carregando convite...</p>}

          {(error || (data && data.status !== "pendente")) && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {data?.status === "aceito"
                ? "Este convite já foi utilizado. Faça login normalmente."
                : data?.status === "expirado"
                ? "Este convite expirou. Peça um novo convite."
                : data?.status === "revogado"
                ? "Este convite foi revogado."
                : "Convite não encontrado."}
            </div>
          )}

          {data && data.status === "pendente" && (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Convite para <strong>{data.email}</strong>
                {data.empresaNome && (
                  <>
                    {" "}
                    em <strong>{data.empresaNome}</strong>
                  </>
                )}{" "}
                como {papelLabel(data.papel)}.
              </div>

              {contaExistente && (
                <p className="mb-4 text-sm text-fg-muted">
                  Já existe uma conta com esse e-mail — confirme sua senha atual pra adicionar esta empresa a ela.
                  Você continua acessando as suas outras empresas normalmente, e troca entre elas pelo menu da conta.
                </p>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                {!contaExistente && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-fg-muted">Seu nome</label>
                    <Input required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-muted">
                    {contaExistente ? "Sua senha" : "Senha"}
                  </label>
                  <Input
                    type="password"
                    required
                    autoFocus={contaExistente}
                    minLength={contaExistente ? undefined : 6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                {!contaExistente && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-fg-muted">Confirmar senha</label>
                    <Input type="password" required minLength={6} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                  </div>
                )}
                {erro && (
                  <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {erro}
                  </div>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  {contaExistente ? "Adicionar empresa e entrar" : "Criar conta e entrar"}
                </Button>
                {!contaExistente && (
                  <p className="text-center text-xs text-fg-subtle">
                    Prefere usar o Google? Volte para a tela de login e entre com o Google usando o e-mail{" "}
                    {data.email} — sua conta é criada automaticamente.
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
