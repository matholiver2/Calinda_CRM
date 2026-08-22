import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/convite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get(AUTH_COOKIE)?.value);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hasToken && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Não redireciona daqui para /dashboard com base em "hasToken" — o cookie
  // pode existir mas ser inválido/expirado (ex.: JWT_SECRET trocado). Como o
  // middleware não faz a verificação real do JWT, isso já causou loop
  // infinito de redirecionamento (login -> dashboard -> login -> ...).
  // Quem decide se um usuário autenticado deve sair de /login é o
  // src/app/login/layout.tsx, que verifica a sessão de verdade.

  return NextResponse.next();
}

export const config = {
  // Além das exclusões padrão do Next, ignora qualquer caminho com extensão
  // de arquivo (imagens/svg/etc. servidos direto de public/) — sem isso,
  // um asset estático como a logo redirecionava pro /login quando pedido
  // por um visitante deslogado (ex: a própria tela de login carregando a logo).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
