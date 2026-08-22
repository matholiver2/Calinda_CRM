// Cliente HTTP do CALINDA para o whatsapp-worker (processo separado que
// segura as sessões Baileys). Usado pelas rotas /api/whatsapp/{connect,qr,disconnect}.

function baseUrl(): string {
  const url = process.env.WHATSAPP_WORKER_URL;
  if (!url) throw new Error("WHATSAPP_WORKER_URL não configurado");
  return url;
}

function secretHeader(): Record<string, string> {
  const secret = process.env.WHATSAPP_WORKER_SECRET;
  if (!secret) throw new Error("WHATSAPP_WORKER_SECRET não configurado");
  return { "x-worker-secret": secret };
}

export async function workerConnect(empresaId: string): Promise<Response> {
  return fetch(`${baseUrl()}/sessions/${empresaId}/connect`, {
    method: "POST",
    headers: secretHeader(),
  });
}

export async function workerGetQr(empresaId: string): Promise<Response> {
  return fetch(`${baseUrl()}/sessions/${empresaId}/qr`, {
    headers: secretHeader(),
  });
}

export async function workerDisconnect(empresaId: string): Promise<Response> {
  return fetch(`${baseUrl()}/sessions/${empresaId}/disconnect`, {
    method: "POST",
    headers: secretHeader(),
  });
}

export async function workerSendDocument(
  empresaId: string,
  params: { telefone: string; documentoBase64: string; fileName: string; mimetype: string }
): Promise<Response> {
  return fetch(`${baseUrl()}/sessions/${empresaId}/send-document`, {
    method: "POST",
    headers: { ...secretHeader(), "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}
