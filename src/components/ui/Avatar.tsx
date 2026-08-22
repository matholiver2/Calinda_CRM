import { iniciais } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  nome,
  cor = "#DC2626",
  fotoUrl,
  size = "md",
  className,
}: {
  nome: string;
  cor?: string;
  fotoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };

  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image não aceita
      <img
        src={fotoUrl}
        alt={nome}
        title={nome}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: cor }}
      title={nome}
    >
      {iniciais(nome)}
    </div>
  );
}
