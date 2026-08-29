import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmpresaAtivaId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { precisaOnboarding, precisaOnboardingPessoal } from "@/lib/onboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmpresaBanner } from "@/components/features/EmpresaBanner";

export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  // getSession já confere Usuario.ativo e MembroEmpresa.ativo da empresa
  // ativa (ver src/lib/session.ts::resolverSessao) — conta ou vínculo
  // desativado depois do login já cai aqui como sessão nula.
  const session = await getSession();
  if (!session) redirect("/login");

  const empresaAtivaId = await getEmpresaAtivaId(session);

  if (session.papel === "super_admin" && !empresaAtivaId) {
    redirect("/empresas");
  }

  // Onboarding é responsabilidade de quem vai usar a empresa no dia a dia
  // (o admin dela) — o super_admin só cria/configura o acesso, não deve
  // ser jogado pro assistente de IA ao entrar numa empresa nova.
  if (empresaAtivaId && session.papel !== "super_admin") {
    const precisaConfigurarEmpresa = session.papel !== "vendedor" && (await precisaOnboarding(empresaAtivaId));
    if (precisaConfigurarEmpresa) {
      // Empresa ainda não tem funil/agentes — admin/gestor monta do zero.
      redirect("/onboarding");
    } else if (await precisaOnboardingPessoal(session.id)) {
      // Empresa já configurada, mas essa pessoa é nova aqui — apresentação curta.
      redirect("/onboarding?modo=pessoal");
    }
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
