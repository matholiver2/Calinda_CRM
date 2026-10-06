"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Columns3, Plug, Users, UserCircle, FileText, CalendarClock, LifeBuoy, CheckCircle2, CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { EtapasConfig } from "@/components/features/config/EtapasConfig";
import { PlanosConfig } from "@/components/features/config/PlanosConfig";
import { IntegracoesConfig } from "@/components/features/config/IntegracoesConfig";
import { UsuariosConfig } from "@/components/features/config/UsuariosConfig";
import { MinhaContaConfig } from "@/components/features/config/MinhaContaConfig";
import { AgendaConfig } from "@/components/features/config/AgendaConfig";
import { SuporteConfig } from "@/components/features/config/SuporteConfig";

const TABS = [
  { id: "conta", label: "Minha conta", icon: UserCircle },
  { id: "etapas", label: "Etapas do funil", icon: Columns3 },
  { id: "planos", label: "Planos", icon: FileText },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "agenda", label: "Agenda", icon: CalendarClock },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ERRO_GOOGLE_LABEL: Record<string, string> = {
  google_estado_invalido: "A conexão expirou ou foi aberta em outra aba — tente conectar de novo.",
  google_sem_refresh_token:
    "O Google não devolveu permissão de acesso contínuo. Revogue o acesso do Calinda em myaccount.google.com/permissions e tente conectar de novo.",
  google_erro: "Não foi possível conectar com o Google. Tente de novo em instantes.",
};

export default function ConfiguracoesPage() {
  const searchParams = useSearchParams();
  const tabInicial = TABS.find((t) => t.id === searchParams.get("tab"))?.id ?? "conta";
  const [tab, setTab] = useState<TabId>(tabInicial);
  const { data } = useSWR<{ usuario: { papel: string } }>("/api/auth/me", fetcher);
  const papel = data?.usuario?.papel;
  const podeEditar = papel === "admin" || papel === "gestor" || papel === "super_admin";

  const googleConectado = searchParams.get("calendario") === "conectado";
  const googleErro = searchParams.get("erro");
  const googleErroDetalhe = searchParams.get("detalhe");

  return (
    <div>
      <PageHeader title="Configurações" description="Conta, etapas do funil, integrações e usuários" />

      {googleConectado && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Google Calendar conectado com sucesso.
        </div>
      )}
      {googleErro && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{ERRO_GOOGLE_LABEL[googleErro] ?? "Não foi possível conectar com o Google."}</p>
            {googleErroDetalhe && <p className="mt-0.5 text-xs opacity-75">Detalhe técnico: {googleErroDetalhe}</p>}
          </div>
        </div>
      )}

      {/* Mobile: dropdown — a fileira de abas fica apertada demais numa tela pequena */}
      <div className="mb-5 sm:hidden">
        <Select value={tab} onChange={(e) => setTab(e.target.value as TabId)}>
          {TABS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Desktop/tablet: fileira de abas */}
      <div className="mb-5 hidden gap-1 overflow-x-auto border-b border-border sm:flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conta" && <MinhaContaConfig />}
      {tab === "etapas" && <EtapasConfig podeEditar={podeEditar} />}
      {tab === "planos" && <PlanosConfig podeEditar={podeEditar} />}
      {tab === "integracoes" && <IntegracoesConfig podeEditar={podeEditar} />}
      {tab === "usuarios" && <UsuariosConfig podeEditar={podeEditar} />}
      {tab === "agenda" && <AgendaConfig podeEditar={podeEditar} />}
      {tab === "suporte" && <SuporteConfig />}
    </div>
  );
}
