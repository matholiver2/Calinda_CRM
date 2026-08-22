import path from "node:path";
import fs from "node:fs/promises";
import QRCode from "qrcode";
import { pino } from "pino";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import { env } from "./env.js";
import { encaminharMensagemRecebida, reportarStatus } from "./calindaClient.js";

type Status = "desconectado" | "conectando" | "conectado";

type Sessao = {
  sock: WASocket | null;
  status: Status;
  qr: string | null;
  numeroConectado: string | null;
  conectando: boolean; // trava contra chamadas concorrentes de connect()
  tentativasReconexao: number;
};

const sessoes = new Map<string, Sessao>();
const logger = pino({ level: "warn" });
const MAX_BACKOFF_MS = 30_000;

function backoffMs(tentativa: number): number {
  return Math.min(1000 * 2 ** tentativa, MAX_BACKOFF_MS);
}

function sessionDir(empresaId: string): string {
  return path.join(env.sessionsDir, empresaId);
}

function getOrCriarSessao(empresaId: string): Sessao {
  let sessao = sessoes.get(empresaId);
  if (!sessao) {
    sessao = {
      sock: null,
      status: "desconectado",
      qr: null,
      numeroConectado: null,
      conectando: false,
      tentativasReconexao: 0,
    };
    sessoes.set(empresaId, sessao);
  }
  return sessao;
}

/** Fecha e desliga os listeners do socket antigo pra não sobrar "zumbi" mutando o estado compartilhado. */
function encerrarSocketAntigo(sessao: Sessao): void {
  if (!sessao.sock) return;
  try {
    sessao.sock.ev.removeAllListeners("connection.update");
    sessao.sock.ev.removeAllListeners("creds.update");
    sessao.sock.ev.removeAllListeners("messages.upsert");
    sessao.sock.ws.close();
  } catch {
    // socket já pode estar fechado — ignora
  }
  sessao.sock = null;
}

export function getStatus(empresaId: string): { status: Status; numeroConectado: string | null } {
  const sessao = sessoes.get(empresaId);
  return { status: sessao?.status ?? "desconectado", numeroConectado: sessao?.numeroConectado ?? null };
}

export async function getQr(empresaId: string): Promise<string | null> {
  return sessoes.get(empresaId)?.qr ?? null;
}

export async function connect(empresaId: string): Promise<void> {
  const sessao = getOrCriarSessao(empresaId);
  if (sessao.status === "conectado" && sessao.sock) {
    console.log(`[sessionManager] ${empresaId} já conectado, ignorando novo connect()`);
    return;
  }
  if (sessao.conectando) {
    console.log(`[sessionManager] ${empresaId} já tem uma conexão em andamento, ignorando chamada duplicada`);
    return;
  }
  sessao.conectando = true;

  console.log(`[sessionManager] iniciando conexão para ${empresaId}...`);
  encerrarSocketAntigo(sessao); // garante que não sobra um socket anterior mutando este mesmo objeto
  await fs.mkdir(sessionDir(empresaId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(empresaId));

  // Sem fetchLatestBaileysVersion(): evita uma chamada de rede ao GitHub a
  // cada connect() — usa a versão empacotada na própria lib (padrão do
  // makeWASocket quando `version` não é informado).
  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });
  console.log(`[sessionManager] socket criado para ${empresaId}, aguardando QR/conexão...`);

  sessao.sock = sock;
  sessao.status = "conectando";
  sessao.qr = null;
  await reportarStatus({ empresaId, status: "conectando" });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    // Se esse socket já não é mais o socket "oficial" da sessão (foi
    // substituído por uma reconexão mais nova), ignora — evita que um
    // socket "zumbi" continue mutando o estado compartilhado.
    if (sessao.sock !== sock) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[sessionManager] QR gerado para ${empresaId}`);
      sessao.qr = await QRCode.toDataURL(qr);
      sessao.status = "conectando";
      await reportarStatus({ empresaId, status: "conectando" });
    }

    if (connection === "open") {
      sessao.status = "conectado";
      sessao.qr = null;
      sessao.conectando = false;
      sessao.tentativasReconexao = 0;
      sessao.numeroConectado = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      console.log(`[sessionManager] ${empresaId} conectado como ${sessao.numeroConectado}`);
      await reportarStatus({ empresaId, status: "conectado", numeroConectado: sessao.numeroConectado });
    }

    if (connection === "close") {
      sessao.conectando = false;
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
        ?.statusCode;
      const deslogado = statusCode === DisconnectReason.loggedOut;

      if (deslogado) {
        sessao.sock = null;
        sessao.status = "desconectado";
        sessao.qr = null;
        sessao.numeroConectado = null;
        sessao.tentativasReconexao = 0;
        await fs.rm(sessionDir(empresaId), { recursive: true, force: true });
        await reportarStatus({ empresaId, status: "desconectado" });
      } else {
        // Queda de rede/reinício do WhatsApp: tenta reconectar automaticamente
        // reaproveitando as credenciais já salvas, com backoff exponencial
        // pra não entrar em loop martelando reconexões.
        const espera = backoffMs(sessao.tentativasReconexao);
        sessao.tentativasReconexao += 1;
        console.log(`[sessionManager] ${empresaId} desconectado, tentando de novo em ${espera}ms`);
        setTimeout(() => {
          void connect(empresaId);
        }, espera);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (sessao.sock !== sock) return; // socket substituído — ignora
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      if (msg.key.remoteJid?.endsWith("@g.us")) continue; // ignora grupos
      if (msg.key.remoteJid === "status@broadcast") continue;

      const texto =
        msg.message.conversation ?? msg.message.extendedTextMessage?.text ?? msg.message.imageMessage?.caption;
      if (!texto) continue; // ignora mídia sem legenda por ora

      // O WhatsApp às vezes identifica o contato por um LID (ID interno,
      // "...@lid") em vez do número de telefone no remoteJid. Quando isso
      // acontece, o próprio Baileys expõe o JID de telefone real em
      // `key.senderPn` (já no formato "...@s.whatsapp.net", pronto pra
      // exibir e pra responder) — usamos ele quando disponível. Só cai pro
      // remoteJid puro se não vier senderPn (contato "normal", sem LID).
      const telefone = msg.key.senderPn ?? msg.key.remoteJid;
      if (!telefone) continue;

      await encaminharMensagemRecebida({
        empresaId,
        telefone,
        texto,
        nome: msg.pushName ?? undefined,
      });
    }
  });
}

export async function disconnect(empresaId: string): Promise<void> {
  const sessao = sessoes.get(empresaId);
  if (sessao?.sock) {
    try {
      await sessao.sock.logout();
    } catch {
      // já pode estar desconectado no servidor do WhatsApp — segue o fluxo
    }
    sessao.sock = null; // impede que listeners do socket antigo ainda em voo mutem este objeto
  }
  sessoes.delete(empresaId);
  await fs.rm(sessionDir(empresaId), { recursive: true, force: true });
  await reportarStatus({ empresaId, status: "desconectado" });
}

function resolverJid(telefone: string): string {
  // `telefone` pode ser um JID completo já ("...@s.whatsapp.net" ou
  // "...@lid", vindo de uma mensagem recebida) ou um número puro (lead
  // criado manualmente/via Meta API) — só monta o JID padrão no segundo caso.
  return telefone.includes("@") ? telefone : `${telefone.replace(/\D/g, "")}@s.whatsapp.net`;
}

function sessaoConectadaOuFalha(empresaId: string): Sessao {
  const sessao = sessoes.get(empresaId);
  if (!sessao?.sock || sessao.status !== "conectado") {
    throw new Error("Sessão não conectada");
  }
  return sessao;
}

/**
 * O WhatsApp reinicia o stream periodicamente (códigos 503/515 nos logs —
 * normal do protocolo), e nessa janela um envio pode cair com "Connection
 * Closed" mesmo com a sessão marcada como conectada. Tenta de novo pegando
 * o socket atual a cada tentativa (não o antigo, que pode já ter sido
 * substituído por uma reconexão) — o backoff de reconexão costuma resolver
 * em 1-2s.
 */
async function enviarComRetry<T>(
  empresaId: string,
  acao: (sock: NonNullable<Sessao["sock"]>) => Promise<T>,
  tentativas = 2,
  esperaMs = 2500
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i <= tentativas; i++) {
    try {
      const sessao = sessaoConectadaOuFalha(empresaId);
      return await acao(sessao.sock!);
    } catch (err) {
      ultimoErro = err;
      if (i < tentativas) {
        console.warn(`[sessionManager] falha ao enviar (tentativa ${i + 1}/${tentativas + 1}), tentando de novo em ${esperaMs}ms:`, (err as Error).message);
        await new Promise((r) => setTimeout(r, esperaMs));
      }
    }
  }
  throw ultimoErro;
}

export async function enviarMensagem(
  empresaId: string,
  telefone: string,
  texto: string
): Promise<{ idExterno: string }> {
  const resultado = await enviarComRetry(empresaId, (sock) => sock.sendMessage(resolverJid(telefone), { text: texto }));
  return { idExterno: resultado?.key.id ?? "" };
}

export async function enviarDocumento(
  empresaId: string,
  telefone: string,
  documentoBase64: string,
  fileName: string,
  mimetype: string
): Promise<{ idExterno: string }> {
  const resultado = await enviarComRetry(empresaId, (sock) =>
    sock.sendMessage(resolverJid(telefone), {
      document: Buffer.from(documentoBase64, "base64"),
      fileName,
      mimetype,
    })
  );
  return { idExterno: resultado?.key.id ?? "" };
}
