import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmpresaAtivaId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { precisaOnboarding } from "@/lib/onboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmpresaBanner } from "@/components/features/EmpresaBanner";

export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const empresaAtivaId = await getEmpresaAtivaId(session);

  if (session.papel === "super_admin" && !empresaAtivaId) {
    redirect("/empresas");
  }

  // Onboarding é responsabilidade de quem vai usar a empresa no dia a dia
  // (o admin dela) — o super_admin só cria/configura o acesso, não deve
  // ser jogado pro assistente de IA ao entrar numa empresa nova.
  if (
    empresaAtivaId &&
    session.papel !== "vendedor" &&
    session.papel !== "super_admin" &&
    (await precisaOnboarding(empresaAtivaId))
  ) {
    redirect("/onboarding");
  }

  const empresa = empresaAtivaId
    ? await prisma.empresa.findUnique({ where: { id: empresaAtivaId }, select: { nome: true } })
    : null;

  return (
    <AppLayout
      usuario={session}
      banner={session.papel === "super_admin" && empresa ? <EmpresaBanner empresaNome={empresa.nome} /> : null}
    >
      {children}
    </AppLayout>
  );
}
