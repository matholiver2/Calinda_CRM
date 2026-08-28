import { NextResponse } from "next/server";
import { requireSession, isSessionResponse, requireEmpresaContext, isEmpresaContextResponse } from "@/lib/apiAuth";
import { caminhoArquivo, criarUploadAssinado } from "@/lib/supabaseStorage";

export async function POST(req: Request) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const body = await req.json().catch(() => null);
  const nomeArquivo = String(body?.nomeArquivo ?? "");
  if (!nomeArquivo) {
    return NextResponse.json({ erro: "nomeArquivo é obrigatório" }, { status: 400 });
  }

  try {
    const path = caminhoArquivo(ctx.empresaId, "comprovantes-vendas", nomeArquivo);
    const { signedUrl, token } = await criarUploadAssinado(path);
    return NextResponse.json({ signedUrl, token, path });
  } catch (err) {
    console.error("[vendas/comprovante-upload]", err);
    return NextResponse.json({ erro: err instanceof Error ? err.message : "Erro ao gerar upload" }, { status: 500 });
  }
}
