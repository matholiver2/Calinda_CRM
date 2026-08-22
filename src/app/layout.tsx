import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
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
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} ${themeClass} h-full antialiased`.trim()}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
