"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import type { SessionPayload } from "@/lib/auth";

export function TopbarSuperAdmin({ usuario }: { usuario: SessionPayload }) {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-elevated px-6 py-4 lg:px-8">
      <div className="flex items-center gap-2.5">
        <Logo size="sm" />
        <span className="font-display text-lg font-semibold tracking-[-0.02em] text-fg">CALINDA</span>
        <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          Super Admin
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar nome={usuario.nome} size="sm" />
        <span className="text-sm text-fg-muted">{usuario.nome}</span>
        <button
          onClick={sair}
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-hover hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
