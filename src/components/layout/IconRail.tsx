"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROUP_B } from "@/components/layout/navItems";

function RailButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        active ? "bg-nav-active text-nav-active-foreground" : "bg-bg-elevated text-fg-subtle hover:bg-surface-hover hover:text-fg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

export function IconRail() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden w-20 shrink-0 flex-col items-center overflow-y-auto rounded-tr-[24px] rounded-bl-[24px] rounded-br-[24px] bg-bg-elevated py-6 shadow-[var(--shadow-float)] md:flex">
      <div className="flex flex-col items-center gap-2.5">
        {GROUP_B.map((item) => (
          <RailButton key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <RailButton href="/configurar-ia" label="Configurar IA" icon={Sparkles} active={isActive("/configurar-ia")} />
        <RailButton href="/configuracoes" label="Configurações" icon={Settings} active={isActive("/configuracoes")} />
        <button
          onClick={sair}
          title="Sair"
          className="flex h-10 w-10 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-hover hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
