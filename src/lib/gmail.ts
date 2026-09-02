// Envio de e-mail via Gmail API, usando a conexão Google do próprio usuário
// (mesmo token do Calendar, com o escopo gmail.send incluído — ver
// googleAuth.ts). Sem SDK, MIME montado na mão, mesmo estilo do resto do
// projeto (googleAuth.ts, googleCalendar.ts).

import { accessTokenValido } from "@/lib/googleTokens";
import type { Usuario } from "@prisma/client";

function encodeSubject(assunto: string): string {
  return `=?UTF-8?B?${Buffer.from(assunto, "utf-8").toString("base64")}?=`;
}

function paraBase64Url(texto: string): string {
  return Buffer.from(texto, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Envio simples, sem anexo — usado pra convite de reunião com o link do Meet. */
export async function enviarEmailSimples(
  usuario: Usuario,
  params: { para: string; assunto: string; corpo: string }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const token = await accessTokenValido(usuario);
  if (!token) {
    return { ok: false, erro: "Google não conectado. Conecte em Configurações → Integrações." };
  }

  const remetente = usuario.googleCalendarEmail ?? usuario.email;

  const mime = [
    `From: ${remetente}`,
    `To: ${params.para}`,
    `Subject: ${encodeSubject(params.assunto)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(params.corpo, "utf-8").toString("base64"),
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: paraBase64Url(mime) }),
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    console.error("[gmail] falha ao enviar:", res.status, texto);
    if (res.status === 403) {
      return {
        ok: false,
        erro: "Sem permissão pra enviar e-mail pelo Google — reconecte em Configurações → Integrações.",
      };
    }
    return { ok: false, erro: "Falha ao enviar e-mail" };
  }

  return { ok: true };
}

export async function enviarEmailComAnexo(
  usuario: Usuario,
  params: {
    para: string;
    assunto: string;
    corpo: string;
    anexoNome: string;
    anexoBuffer: Buffer;
    anexoMimeType: string;
  }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const token = await accessTokenValido(usuario);
  if (!token) {
    return { ok: false, erro: "Google não conectado. Conecte em Configurações → Integrações." };
  }

  const boundary = `calinda_${Date.now()}`;
  const remetente = usuario.googleCalendarEmail ?? usuario.email;

  const mime = [
    `From: ${remetente}`,
    `To: ${params.para}`,
    `Subject: ${encodeSubject(params.assunto)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(params.corpo, "utf-8").toString("base64"),
    "",
    `--${boundary}`,
    `Content-Type: ${params.anexoMimeType}; name="${params.anexoNome}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${params.anexoNome}"`,
    "",
    params.anexoBuffer.toString("base64"),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: paraBase64Url(mime) }),
  });

  if (!res.ok) {
    const texto = await res.text().catch(() => "");
    console.error("[gmail] falha ao enviar:", res.status, texto);
    if (res.status === 403) {
      return {
        ok: false,
        erro: "Sem permissão pra enviar e-mail pelo Google — reconecte em Configurações → Integrações.",
      };
    }
    return { ok: false, erro: "Falha ao enviar e-mail" };
  }

  return { ok: true };
}
