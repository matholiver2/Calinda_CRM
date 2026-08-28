import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEmpresaAtivaId } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { precisaOnboarding, precisaOnboardingPessoal } from "@/lib/onboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmpresaBanner } from "@/components/features/EmpresaBanner";

export default async function RouteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Conta pode ter sido desativada por um admin depois do login — o JWT
  // sozinho não sabe disso (ver mesmo check em src/lib/apiAuth.ts). Só
  // redireciona (cookie não pode ser limpo aqui, fora de Server
  // Action/Route Handler) — a próxima chamada de API já derruba de vez via
  // requireSession + o tratamento de 401 em src/lib/fetcher.ts.
  const usuarioAtivo = await prisma.usuario.findUnique({ where: { id: session.id }, select: { ativo: true } });
  if (!usuarioAtivo?.ativo) redirect("/login");

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
