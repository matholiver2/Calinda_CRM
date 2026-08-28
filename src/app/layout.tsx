import type { Metadata, Viewport } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import "./globals.css";

// Sora é a fonte oficial da identidade CALINDA — usada tanto pro corpo do
// texto quanto pra títulos/destaques (--font-sans e --font-display apontam
// pra ela), pra o produto inteiro soar como uma peça só. Pesos cobrem toda
// a hierarquia: 400 corpo, 500 labels/navegação, 600 títulos/botões, 700
// números/KPIs.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CALINDA",
  description: "CRM automatizado com IA — condução de leads via WhatsApp até o agendamento de reunião.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CALINDA",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0F0D",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const tema = store.get(THEME_COOKIE)?.value;
  const themeClass = tema === "dark" ? "dark" : "light";

  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${plexMono.variable} ${themeClass} h-full antialiased`.trim()}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
