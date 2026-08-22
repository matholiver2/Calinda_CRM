// Camada de integração com WhatsApp (seção 6.1 do descritivo técnico).
//
// Abstrai o provedor por trás de uma interface única, para permitir trocar
// entre Meta Cloud API, Baileys (não-oficial) etc. sem alterar o motor de
// automação. Em desenvolvimento (sem credenciais/sessão configuradas), usa
// um provedor "mock" que apenas retorna sucesso — o envio real é simulado
// na tela "Conversas com IA".
//
// Resolução por empresa: se a empresa tiver uma WhatsappSessao com
// status "conectado" (ver whatsapp-worker/), usamos o BaileysWorkerProvider;
// caso contrário caímos no comportamento global via env (WHATSAPP_PROVIDER).

import { prisma } from "@/lib/db";
import { workerSendDocument } from "@/lib/whatsapp/worker";

export type EnvioResultado = {
  idExterno: string;
  status: "enviado" | "falhou";
};

export interface WhatsAppProvider {
  enviarMensagem(telefone: string, texto: string): Promise<EnvioResultado>;
  /** Nem todo provedor suporta enviar arquivo (ex: orçamento em PDF) — só o Baileys nesta versão. */
  enviarDocumento?(
    telefone: string,
    documentoBase64: string,
    fileName: string,
    mimetype: string
  ): Promise<EnvioResultado>;
}

class MockWhatsAppProvider implements WhatsAppProvider {
  async enviarMensagem(telefone: string, texto: string): Promise<EnvioResultado> {
    console.log(`[whatsapp:mock] -> ${telefone}: ${texto}`);
    return { idExterno: `mock_${Date.now()}`, status: "enviado" };
  }
}

class MetaCloudApiProvider implements WhatsAppProvider {
  constructor(private token: string, private phoneId: string) {}

  async enviarMensagem(telefone: string, texto: string): Promise<EnvioResultado> {
    const res = await fetch(`https://graph.facebook.com/v20.0/${this.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefone,
        type: "text",
        text: { body: texto },
      }),
    });
    if (!res.ok) return { idExterno: "", status: "falhou" };
    const data = (await res.json()) as { messages?: { id: string }[] };
    return { idExterno: data.messages?.[0]?.id ?? "", status: "enviado" };
  }
}

class BaileysWorkerProvider implements WhatsAppProvider {
  constructor(private empresaId: string) {}

  async enviarMensagem(telefone: string, texto: string): Promise<EnvioResultado> {
    const baseUrl = process.env.WHATSAPP_WORKER_URL;
    const secret = process.env.WHATSAPP_WORKER_SECRET;
    if (!baseUrl || !secret) return { idExterno: "", status: "falhou" };

    const res = await fetch(`${baseUrl}/sessions/${this.empresaId}/send`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-worker-secret": secret },
      body: JSON.stringify({ telefone, texto }),
    });
    if (!res.ok) return { idExterno: "", status: "falhou" };
    const data = (await res.json().catch(() => null)) as { idExterno?: string } | null;
    return { idExterno: data?.idExterno ?? "", status: "enviado" };
  }

  async enviarDocumento(
    telefone: string,
    documentoBase64: string,
    fileName: string,
    mimetype: string
  ): Promise<EnvioResultado> {
    const res = await workerSendDocument(this.empresaId, { telefone, documentoBase64, fileName, mimetype });
    if (!res.ok) return { idExterno: "", status: "falhou" };
    const data = (await res.json().catch(() => null)) as { idExterno?: string } | null;
    return { idExterno: data?.idExterno ?? "", status: "enviado" };
  }
}

function getEnvProvider(): WhatsAppProvider {
  const providerName = process.env.WHATSAPP_PROVIDER || "mock";
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (providerName === "meta" && token && phoneId) {
    return new MetaCloudApiProvider(token, phoneId);
  }
  return new MockWhatsAppProvider();
}

export async function getWhatsAppProvider(empresaId: string): Promise<WhatsAppProvider> {
  const sessao = await prisma.whatsappSessao.findUnique({ where: { empresaId } });
  if (sessao?.status === "conectado") {
    return new BaileysWorkerProvider(empresaId);
  }
  return getEnvProvider();
}
