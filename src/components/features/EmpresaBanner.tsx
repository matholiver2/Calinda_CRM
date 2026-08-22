"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { apiPost } from "@/lib/fetcher";

export function EmpresaBanner({ empresaNome }: { empresaNome: string }) {
  const router = useRouter();

  async function sair() {
    await apiPost("/api/empresas/sair");
    router.push("/empresas");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-6 py-2 text-sm text-warning lg:px-8">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Modo super admin — visualizando <strong>{empresaNome}</strong>
        </span>
      </div>
      <button onClick={sair} className="flex items-center gap-1.5 font-medium hover:underline">
        <LogOut className="h-3.5 w-3.5" /> Sair para Empresas
      </button>
    </div>
  );
}
