import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TopbarSuperAdmin } from "@/components/layout/TopbarSuperAdmin";

export default async function EmpresasLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.papel !== "super_admin") redirect("/dashboard");

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <TopbarSuperAdmin usuario={session} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
