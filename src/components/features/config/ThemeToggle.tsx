"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { THEME_COOKIE } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const router = useRouter();
  const [temaAtual, setTemaAtual] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  function definirTema(tema: "light" | "dark") {
    if (tema === temaAtual) return;
    document.cookie = `${THEME_COOKIE}=${tema}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(tema);
    setTemaAtual(tema);
    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
      <button
        type="button"
        onClick={() => definirTema("light")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          temaAtual === "light" ? "bg-accent-soft text-accent" : "text-fg-subtle hover:text-fg"
        )}
      >
        <Sun className="h-3.5 w-3.5" /> Claro
      </button>
      <button
        type="button"
        onClick={() => definirTema("dark")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          temaAtual === "dark" ? "bg-accent-soft text-accent" : "text-fg-subtle hover:text-fg"
        )}
      >
        <Moon className="h-3.5 w-3.5" /> Escuro
      </button>
    </div>
  );
}
