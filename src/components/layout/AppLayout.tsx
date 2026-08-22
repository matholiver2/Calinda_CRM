import { TopNavbar } from "@/components/layout/TopNavbar";
import { IconRail } from "@/components/layout/IconRail";
import type { SessionPayload } from "@/lib/auth";

/**
 * Single shared app shell for every authenticated route. On desktop (md+),
 * header and left icon rail render as separate floating cards on the gray
 * page background. Below md, the icon rail is replaced by the hamburger
 * drawer inside TopNavbar (see MobileNavDrawer) and the shell goes
 * full-bleed instead of the fixed-size floating card. Pages must not
 * redeclare container width/height, padding, radius or shadow — only what
 * renders inside `children` may differ.
 */
export function AppLayout({
  usuario,
  banner,
  children,
}: {
  usuario: SessionPayload;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg">
      <div className="flex h-screen w-full flex-col md:h-[96vh] md:w-[97.5vw] md:max-w-[1760px]">
        <TopNavbar usuario={usuario} />
        <div className="flex flex-1 gap-2 overflow-hidden">
          <IconRail />
          <div className="mt-2 flex flex-1 flex-col overflow-hidden rounded-[24px] bg-bg-elevated shadow-[var(--shadow-float)]">
            {banner}
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto h-full max-w-7xl px-4 py-5 sm:px-6 md:px-8 md:py-8 lg:px-10">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
