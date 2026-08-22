import { createClient } from "@supabase/supabase-js";

const BUCKET = "arquivos-empresa";

// Só usado server-side (rotas de API) — a service role key nunca deve ir
// pro client. Sem as envs configuradas, criarUploadAssinado/etc lançam erro
// e a rota devolve uma mensagem clara em vez de um 500 genérico.
function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage não configurado — defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env"
    );
  }
  return createClient(url, key);
}

export function caminhoArquivo(empresaId: string, pastaId: string, nomeArquivo: string): string {
  return `${empresaId}/${pastaId}/${crypto.randomUUID()}-${nomeArquivo}`;
}

export async function criarUploadAssinado(path: string) {
  const { data, error } = await client().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return data; // { path, token, signedUrl }
}

export async function criarDownloadAssinado(path: string, nomeArquivo: string) {
  const { data, error } = await client()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60 * 5, { download: nomeArquivo });
  if (error) throw error;
  return data.signedUrl;
}

export async function baixarArquivoBuffer(path: string): Promise<Buffer> {
  const { data, error } = await client().storage.from(BUCKET).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function removerArquivos(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await client().storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
