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

/**
 * Apaga tudo dentro de um prefixo (ex: todos os arquivos de uma empresa,
 * `${empresaId}/...`) — lista recursivamente porque o Storage do Supabase
 * só lista um nível por vez. Usado ao excluir uma empresa por completo.
 */
export async function removerTudoComPrefixo(prefixo: string) {
  const bucket = client().storage.from(BUCKET);

  async function listarArquivosRecursivo(caminho: string): Promise<string[]> {
    const { data, error } = await bucket.list(caminho, { limit: 1000 });
    if (error || !data) return [];
    const arquivos: string[] = [];
    for (const item of data) {
      const caminhoItem = `${caminho}/${item.name}`;
      if (item.id) {
        // Tem id = é um arquivo de verdade; sem id = é uma "pasta" (prefixo).
        arquivos.push(caminhoItem);
      } else {
        arquivos.push(...(await listarArquivosRecursivo(caminhoItem)));
      }
    }
    return arquivos;
  }

  const arquivos = await listarArquivosRecursivo(prefixo);
  if (arquivos.length > 0) {
    const { error } = await bucket.remove(arquivos);
    if (error) throw error;
  }
}
