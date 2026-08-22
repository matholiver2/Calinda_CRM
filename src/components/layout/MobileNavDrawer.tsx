"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { TABS, GROUP_B } from "@/components/layout/navItems";

const TODOS_OS_ITENS = [...TABS, ...GROUP_B];

export function MobileNavDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-fg-muted hover:bg-border md:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <div className="relative flex h-full w-[82%] max-w-[320px] flex-col bg-bg-elevated shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Logo size="sm" />
                <span className="font-display text-base font-bold tracking-tight text-fg">CALINDA</span>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {TODOS_OS_ITENS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAberto(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-nav-active text-nav-active-foreground" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-1 border-t border-border p-3">
              <Link
                href="/configuracoes"
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive("/configuracoes") ? "bg-nav-active text-nav-active-foreground" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                )}
              >
                <Settings className="h-4.5 w-4.5" /> Configurações
              </Link>
              <button
                onClick={sair}
                className="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-sm font-medium text-fg-muted hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="h-4.5 w-4.5" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
