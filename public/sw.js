// Service worker mínimo — só existe pra satisfazer o critério de
// instalabilidade do PWA (Chrome/Edge exigem um SW com fetch handler).
// Não faz cache agressivo de nada: o app tem dados dinâmicos por sessão
// (leads, conversas, cookies de auth), então cachear páginas/API aqui
// causaria dados velhos ou vazamento entre contas. Só deixa a rede seguir
// seu curso normal.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // sem interceptação — deixa passar direto pra rede.
});
