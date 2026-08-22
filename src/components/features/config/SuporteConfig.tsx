"use client";

import { useState } from "react";
import useSWR from "swr";
import { Send, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { fetcher } from "@/lib/fetcher";
import { CARD } from "@/lib/utils";

const EMAIL_DESENVOLVEDOR = "sysdevenbr@gmail.com";

type MeuUsuario = { nome: string; email: string };

export function SuporteConfig() {
  const { data } = useSWR<{ usuario: MeuUsuario }>("/api/auth/me", fetcher);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const usuario = data?.usuario;
    const corpo = `${mensagem}\n\n---\nEnviado por: ${usuario?.nome ?? ""} <${usuario?.email ?? ""}>`;
    const params = new URLSearchParams({ subject: assunto, body: corpo });
    window.location.href = `mailto:${EMAIL_DESENVOLVEDOR}?${params.toString()}`;
  }

  return (
    <div className={`${CARD} max-w-xl`}>
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-fg-muted">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-fg">Falar com o desenvolvedor</h2>
          <p className="text-xs text-fg-subtle">Abre seu aplicativo de e-mail com a mensagem já preenchida.</p>
        </div>
      </div>
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Assunto</label>
          <Input required value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex: dúvida sobre integração com WhatsApp" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Mensagem</label>
          <Textarea required rows={6} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Descreva o que está acontecendo..." />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            <Send className="h-3.5 w-3.5" /> Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
