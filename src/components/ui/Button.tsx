import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
    secondary: "bg-surface text-fg-muted border border-border hover:bg-surface-hover",
    ghost: "text-fg-muted hover:text-fg hover:bg-surface-hover",
    danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  };
  const sizes = { sm: "text-xs px-3 py-1.5 gap-1.5", md: "text-sm px-5 py-2.5 gap-2" };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
