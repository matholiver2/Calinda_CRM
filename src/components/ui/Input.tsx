import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition-colors focus:border-accent",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
