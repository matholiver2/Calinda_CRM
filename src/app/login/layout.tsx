import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) {
    // Não manda de volta pro app se a conta foi desativada nesse meio tempo
    // — sem isso, um cookie de sessão desativada ainda válido jogava a
    // pessoa direto de volta pro app (ver check equivalente em
    // src/app/(app)/layout.tsx), formando um loop login -> app -> login.
    const usuario = await prisma.usuario.findUnique({ where: { id: session.id }, select: { ativo: true } });
    if (usuario?.ativo) {
      redirect(session.papel === "super_admin" ? "/empresas" : "/dashboard");
    }
  }
  return <>{children}</>;
}
