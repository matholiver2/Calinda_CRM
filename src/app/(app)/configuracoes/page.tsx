"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Columns3, Bot, Plug, Users, UserCircle, FileText, CalendarClock, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { EtapasConfig } from "@/components/features/config/EtapasConfig";
import { AgentesConfig } from "@/components/features/config/AgentesConfig";
import { PlanosConfig } from "@/components/features/config/PlanosConfig";
import { IntegracoesConfig } from "@/components/features/config/IntegracoesConfig";
import { UsuariosConfig } from "@/components/features/config/UsuariosConfig";
import { MinhaContaConfig } from "@/components/features/config/MinhaContaConfig";
import { AgendaConfig } from "@/components/features/config/AgendaConfig";
import { SuporteConfig } from "@/components/features/config/SuporteConfig";

const TABS = [
  { id: "conta", label: "Minha conta", icon: UserCircle },
  { id: "etapas", label: "Etapas do funil", icon: Columns3 },
  { id: "agentes", label: "Agentes de IA", icon: Bot },
  { id: "planos", label: "Planos", icon: FileText },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "agenda", label: "Agenda", icon: CalendarClock },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ConfiguracoesPage() {
  const searchParams = useSearchParams();
  const tabInicial = TABS.find((t) => t.id === searchParams.get("tab"))?.id ?? "conta";
  const [tab, setTab] = useState<TabId>(tabInicial);
  const { data } = useSWR<{ usuario: { papel: string } }>("/api/auth/me", fetcher);
  const papel = data?.usuario?.papel;
  const podeEditar = papel === "admin" || papel === "gestor" || papel === "super_admin";

  return (
    <div>
      <PageHeader title="Configurações" description="Conta, etapas do funil, agentes de IA, integrações e usuários" />

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
      {tab === "agentes" && <AgentesConfig podeEditar={podeEditar} />}
      {tab === "planos" && <PlanosConfig podeEditar={podeEditar} />}
      {tab === "integracoes" && <IntegracoesConfig podeEditar={podeEditar} />}
      {tab === "usuarios" && <UsuariosConfig podeEditar={podeEditar} />}
      {tab === "agenda" && <AgendaConfig podeEditar={podeEditar} />}
      {tab === "suporte" && <SuporteConfig />}
    </div>
  );
}
