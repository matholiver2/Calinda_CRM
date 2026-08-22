import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = { sm: "h-8 w-8", lg: "h-12 w-12" };
const PX = { sm: 32, lg: 48 };

export function Logo({
  size = "sm",
  px,
  className,
}: {
  size?: "sm" | "lg";
  /** Sobrescreve o tamanho do preset com um valor exato em pixels. */
  px?: number;
  className?: string;
}) {
  const tamanho = px ?? PX[size];
  return (
    <Image
      src="/logo-calinda.png"
      alt="CALINDA"
      width={tamanho}
      height={tamanho}
      className={cn(px ? undefined : SIZES[size], "object-contain", className)}
      style={px ? { width: tamanho, height: tamanho } : undefined}
      priority
    />
  );
}
