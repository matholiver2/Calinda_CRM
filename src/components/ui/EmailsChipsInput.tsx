"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Campo de e-mails estilo "convidados" (chips removíveis) — Enter, vírgula ou espaço confirmam cada um. */
export function EmailsChipsInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [digitando, setDigitando] = useState("");
  const [foco, setFoco] = useState(false);

  function adicionar(texto: string) {
    const email = texto.trim().replace(/,$/, "");
    if (!email) return;
    if (!email.includes("@") || value.includes(email)) {
      setDigitando("");
      return;
    }
    onChange([...value, email]);
    setDigitando("");
  }

  function remover(email: string) {
    onChange(value.filter((e) => e !== email));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      if (digitando.trim()) {
        e.preventDefault();
        adicionar(digitando);
      }
      return;
    }
    if (e.key === "Backspace" && !digitando && value.length > 0) {
      remover(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 rounded-[10px] border bg-surface px-2.5 py-2 transition-colors",
        foco ? "border-accent" : "border-border",
        className
      )}
    >
      {value.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-fg"
        >
          {email}
          <button
            type="button"
            onClick={() => remover(email)}
            className="text-fg-subtle hover:text-danger"
            aria-label={`Remover ${email}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={digitando}
        onChange={(e) => setDigitando(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setFoco(false);
          adicionar(digitando);
        }}
        onFocus={() => setFoco(true)}
        placeholder={value.length === 0 ? (placeholder ?? "E-mail e Enter") : ""}
        className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-sm text-fg placeholder:text-fg-subtle outline-none"
      />
    </div>
  );
}
