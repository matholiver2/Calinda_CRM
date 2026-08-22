import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CALINDA",
    short_name: "CALINDA",
    description: "CRM automatizado com IA — condução de leads via WhatsApp até o agendamento de reunião.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B0F0D",
    theme_color: "#0B0F0D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
