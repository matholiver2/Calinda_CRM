"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { TABS } from "@/components/layout/navItems";
import type { SessionPayload } from "@/lib/auth";

export function TopNavbar({ usuario }: { usuario: SessionPayload }) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] bg-bg-elevated px-4 shadow-[var(--shadow-float)] md:px-8">
      <div className="flex items-center gap-2 md:gap-2.5">
        <MobileNavDrawer />
        <Logo size="sm" />
        <span className="hidden font-display text-lg font-bold tracking-tight text-fg sm:inline">CALINDA</span>
      </div>

      <nav className="hidden h-9 items-center gap-1 rounded-full bg-bg px-1.5 md:flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-nav-active text-nav-active-foreground shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <GlobalSearch />
        <NotificationBell />
        <AccountSwitcher usuario={usuario} />
      </div>
    </header>
  );
}
