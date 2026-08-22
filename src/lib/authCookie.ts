// Só a constante do nome do cookie — sem imports pesados. O middleware/proxy
// roda no Edge Runtime da Vercel, que não suporta jsonwebtoken/bcryptjs
// (usados em @/lib/auth); qualquer import de lá quebraria o Edge em toda
// requisição. Módulo separado só pra isso, importado direto pelo middleware.
export const AUTH_COOKIE = "assiz_token";
