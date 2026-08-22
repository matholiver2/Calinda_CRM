"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/fetcher";

const ORIGENS = ["Instagram Ads", "Google Ads", "Indicação", "WhatsApp", "Site", "Outro"];

export function NovoLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [origem, setOrigem] = useState(ORIGENS[0]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setNome("");
    setTelefone("");
    setEmail("");
    setOrigem(ORIGENS[0]);
    setErro(null);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await apiPost("/api/leads", { nome, telefone, email: email || undefined, origem });
      mutate("/api/leads");
      mutate("/api/dashboard/metrica-geral");
      fechar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao criar lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={fechar} title="Novo lead">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Nome</label>
          <Input required autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Telefone (WhatsApp)</label>
          <Input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+5511999999999"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">E-mail (opcional)</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lead@empresa.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg-muted">Origem</label>
          <Select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Criar lead
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
