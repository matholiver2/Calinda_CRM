import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  // getSession já confere Usuario.ativo e MembroEmpresa.ativo da empresa
  // ativa — uma sessão desativada volta null aqui, então não há risco de
  // loop (login -> app -> login) que existia quando isso era checado à parte.
  const session = await getSession();
  if (session) {
    redirect(session.papel === "super_admin" ? "/empresas" : "/dashboard");
  }
  return <>{children}</>;
}
