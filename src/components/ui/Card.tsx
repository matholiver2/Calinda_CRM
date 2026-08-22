import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border-none bg-surface shadow-[var(--shadow-card)]",
        accentColor && "border-l-4",
        className
      )}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      {children}
    </div>
  );
}
