import Image from "next/image";
import calindaEscrita from "@/assets/Calinda_escrita.png";
import { cn } from "@/lib/utils";

/**
 * Wordmark "Calinda" (texto, não o ícone — ver Logo.tsx) usado no lugar do
 * texto solto "CALINDA" nos cabeçalhos e na tela de login. Import estático
 * (não /public) porque o arquivo fica em src/assets — o Next já resolve
 * width/height intrínsecos a partir do import, só ajustamos a altura exibida
 * via className e deixamos a largura seguir a proporção original (2128x1009).
 */
export function LogoEscrita({ heightClassName = "h-5", className }: { heightClassName?: string; className?: string }) {
  return (
    <Image
      src={calindaEscrita}
      alt="Calinda"
      className={cn(heightClassName, "w-auto object-contain", className)}
      priority
    />
  );
}
