"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { fetcher } from "@/lib/fetcher";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const ERROS_GOOGLE: Record<string, string> = {
  nao_convidado: "Esse e-mail ainda não foi convidado. Peça a um admin para te convidar.",
  google_estado_invalido: "Sessão de login expirou, tente novamente.",
  google_email_nao_verificado: "Seu e-mail do Google precisa estar verificado.",
  conta_inativa: "Sua conta está inativa. Fale com um administrador.",
  google_erro: "Não foi possível entrar com o Google. Tente novamente.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(() => {
    const erroParam = params.get("erro");
    return erroParam ? (ERROS_GOOGLE[erroParam] ?? "Não foi possível entrar.") : null;
  });
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const { data: googleStatus } = useSWR<{ configurado: boolean }>("/api/auth/google-status", fetcher);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Não foi possível entrar");
        return;
      }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Logo px={120} className="mb-3" />
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-fg">CALINDA</h1>
          <p className="mt-1 text-sm text-fg-muted">CRM automatizado com IA</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
          {googleStatus?.configurado && (
            <>
              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-bg-elevated px-3.5 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-hover"
              >
                <GoogleIcon />
                Entrar com Google
              </a>
              <div className="my-4 flex items-center gap-3 text-xs text-fg-subtle">
                <div className="h-px flex-1 bg-border" />
                ou
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-muted">E-mail</label>
                <Input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-fg-muted">Senha</label>
                <div className="relative">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    tabIndex={-1}
                    title={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {erro && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            <Button type="submit" loading={loading} className="mt-5 w-full">
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-fg-subtle">
          O acesso ao CALINDA é somente por convite. Recebeu um link de convite? Abra-o para criar sua conta.
        </p>

        <p className="mt-3 text-center text-xs text-fg-subtle">
          <a href="/privacidade" className="hover:text-fg-muted hover:underline">
            Política de Privacidade
          </a>
          {" · "}
          <a href="/termos" className="hover:text-fg-muted hover:underline">
            Termos de Uso
          </a>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.89c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.89-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
