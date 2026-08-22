"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação como PWA fica indisponível, mas o app continua funcionando normalmente
      });
    }
  }, []);
  return null;
}
