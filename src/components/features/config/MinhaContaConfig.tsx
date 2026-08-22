"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { Save, ShieldCheck, Mail, Building2, UserCircle, Palette, Camera, X, ImageUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/features/config/ThemeToggle";
import { fetcher, apiPatch, apiDelete, ApiError } from "@/lib/fetcher";
import { papelLabel, CARD, CARD_LG } from "@/lib/utils";

type MeuUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  avatarCor: string;
  avatarUrl: string | null;
  temSenha: boolean;
  temGoogle: boolean;
  empresaAtiva: { id: string; nome: string; logoUrl: string | null } | null;
};

const AVATAR_LADO_PX = 256;
const LOGO_LARGURA_MAX_PX = 480;

function redimensionarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_LADO_PX;
      canvas.height = AVATAR_LADO_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponível"));
        return;
      }
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, AVATAR_LADO_PX, AVATAR_LADO_PX);
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

/** Logo mantém a proporção original (não é recortada em quadrado como o avatar). */
function redimensionarLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const escala = Math.min(1, LOGO_LARGURA_MAX_PX / img.width);
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
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

const PAPEL_COR: Record<string, string> = {
  super_admin: "#DC2626",
  admin: "#DC2626",
  gestor: "#3B82F6",
  vendedor: "#10B981",
};

export function MinhaContaConfig() {
  const { data, mutate: refetch } = useSWR<{ usuario: MeuUsuario }>("/api/auth/me", fetcher);
  const usuario = data?.usuario;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  async function onSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErroFoto("Selecione um arquivo de imagem");
      return;
    }
    setErroFoto(null);
    setEnviandoFoto(true);
    try {
      const dataUrl = await redimensionarImagem(file);
      await apiPatch("/api/auth/avatar", { avatarUrl: dataUrl });
      await refetch();
    } catch (err) {
      setErroFoto(err instanceof ApiError ? err.message : "Erro ao enviar a foto");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function onRemoverFoto() {
    setEnviandoFoto(true);
    try {
      await apiDelete("/api/auth/avatar");
      await refetch();
    } catch (err) {
      setErroFoto(err instanceof ApiError ? err.message : "Erro ao remover a foto");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function onSelecionarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErroLogo("Selecione um arquivo de imagem");
      return;
    }
    setErroLogo(null);
    setEnviandoLogo(true);
    try {
      const dataUrl = await redimensionarLogo(file);
      await apiPatch("/api/empresa/logo", { logoUrl: dataUrl });
      await refetch();
    } catch (err) {
      setErroLogo(err instanceof ApiError ? err.message : "Erro ao enviar a logo");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function onRemoverLogo() {
    setEnviandoLogo(true);
    try {
      await apiDelete("/api/empresa/logo");
      await refetch();
    } catch (err) {
      setErroLogo(err instanceof ApiError ? err.message : "Erro ao remover a logo");
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <div className={CARD}>
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
              <UserCircle className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-fg">Sua conta</h2>
          </div>
          {usuario && (
            <div className="flex items-center gap-4">
              <div className="group relative">
                <Avatar nome={usuario.nome} cor={usuario.avatarCor} fotoUrl={usuario.avatarUrl} size="lg" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={enviandoFoto}
                  title="Alterar foto"
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg-elevated bg-fg text-bg shadow-sm transition-colors hover:bg-fg-muted disabled:opacity-50"
                >
                  <Camera className="h-3 w-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onSelecionarFoto}
                />
              </div>
              <div>
                <p className="text-base font-semibold text-fg">{usuario.nome}</p>
                <p className="flex items-center gap-1.5 text-sm text-fg-muted">
                  <Mail className="h-3.5 w-3.5" /> {usuario.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge color={PAPEL_COR[usuario.papel]}>
                    {usuario.papel === "super_admin" ? "Super Admin" : papelLabel(usuario.papel)}
                  </Badge>
                  {usuario.empresaAtiva && (
                    <Badge color="#71717a" variant="outline">
                      <Building2 className="h-3 w-3" /> {usuario.empresaAtiva.nome}
                    </Badge>
                  )}
                </div>
                {usuario.avatarUrl && (
                  <button
                    type="button"
                    onClick={onRemoverFoto}
                    disabled={enviandoFoto}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-fg-subtle hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> Remover foto
                  </button>
                )}
                {erroFoto && <p className="mt-1.5 text-xs text-danger">{erroFoto}</p>}
              </div>
            </div>
          )}
        </div>

        <div className={CARD}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">Aparência</h2>
              <p className="text-xs text-fg-subtle">Escolha entre o tema claro e o escuro.</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {usuario?.empresaAtiva &&
          (usuario.papel === "admin" || usuario.papel === "gestor" || usuario.papel === "super_admin") && (
            <div className={CARD}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
                  <ImageUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-fg">Logomarca da empresa</h2>
                  <p className="text-xs text-fg-subtle">Aparece em orçamentos e materiais gerados pro cliente.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-hover">
                  {usuario.empresaAtiva.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL
                    <img
                      src={usuario.empresaAtiva.logoUrl}
                      alt={usuario.empresaAtiva.nome}
                      className="max-h-full max-w-full object-contain p-1.5"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-fg-subtle" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={enviandoLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImageUp className="h-3.5 w-3.5" /> Enviar logo
                  </Button>
                  {usuario.empresaAtiva.logoUrl && (
                    <button
                      type="button"
                      onClick={onRemoverLogo}
                      disabled={enviandoLogo}
                      className="flex items-center gap-1 text-xs font-medium text-fg-subtle hover:text-danger disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Remover logo
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onSelecionarLogo} />
                </div>
              </div>
              {erroLogo && <p className="mt-2 text-xs text-danger">{erroLogo}</p>}
            </div>
          )}
      </div>

      {usuario && (
        <div className={CARD_LG}>
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg">
                {usuario.temSenha ? "Alterar senha" : "Definir senha"}
              </h2>
              <p className="text-xs text-fg-subtle">
                {usuario.temSenha
                  ? "Informe a senha atual e a nova senha."
                  : "Sua conta foi criada com login do Google. Defina uma senha para também poder entrar com e-mail e senha."}
              </p>
            </div>
          </div>
          <SenhaForm temSenha={usuario.temSenha} onSalvo={() => refetch()} />
        </div>
      )}
    </div>
  );
}

function SenhaForm({ temSenha, onSalvo }: { temSenha: boolean; onSalvo: () => void }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await apiPatch("/api/auth/senha", { senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
      setSucesso(true);
      onSalvo();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {temSenha && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Senha atual</label>
          <Input type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nova senha</label>
        <Input type="password" required minLength={6} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-fg-muted">Confirmar nova senha</label>
        <Input type="password" required minLength={6} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      {sucesso && <p className="text-sm text-success">Senha atualizada com sucesso.</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>
    </form>
  );
}
