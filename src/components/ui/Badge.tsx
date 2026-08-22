import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  color?: string;
  variant?: "solid" | "soft" | "outline";
  className?: string;
};

export function Badge({ children, color = "#71717a", variant = "soft", className }: BadgeProps) {
  const style =
    variant === "soft"
      ? { backgroundColor: `${color}22`, color, borderColor: `${color}44` }
      : variant === "outline"
      ? { color, borderColor: `${color}66` }
      : { backgroundColor: color, color: "#fff", borderColor: color };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
