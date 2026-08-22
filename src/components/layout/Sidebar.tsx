"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Columns3,
  Users,
  MessageSquareText,
  Repeat2,
  BarChart3,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { cn, papelLabel } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import type { SessionPayload } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/funil", label: "Funil", icon: Columns3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/conversas", label: "Conversas com IA", icon: MessageSquareText },
  { href: "/remarketing", label: "Remarketing", icon: Repeat2 },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ usuario, empresaNome }: { usuario: SessionPayload; empresaNome?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-display text-lg font-bold tracking-tight text-fg">CALINDA</span>
        </div>
        {empresaNome && (
          <div className="mt-2 flex items-center gap-1.5 truncate text-xs text-fg-subtle">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{empresaNome}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-fg-muted hover:bg-surface-hover hover:text-fg"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar nome={usuario.nome} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{usuario.nome}</p>
            <p className="truncate text-xs text-fg-subtle">
              {usuario.papel === "super_admin" ? "Super Admin" : papelLabel(usuario.papel)}
            </p>
          </div>
          <button
            onClick={sair}
            title="Sair"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
