import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";

type Checagem = { chave: string; label: string; ok: boolean; detalhe: string };

/**
 * Diagnóstico self-service da conexão WhatsApp/IA — pensado pra quem não
 * consegue ler logs do Vercel/Railway descobrir sozinho o que está quebrado
 * (ex: worker do WhatsApp fora do ar, chave do Gemini inválida, nenhum
 * agente de IA ativo na etapa). Usado pelo botão "Testar conexão" em
 * Configurações.
 */
export async function GET() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const checagens: Checagem[] = [];

  // 1. Banco de dados — se chegamos até aqui, a query abaixo prova que o
  // pool de conexões está respondendo (histórico de P1001/P2024 no sistema).
  try {
    await prisma.empresa.findUniqueOrThrow({ where: { id: ctx.empresaId } });
    checagens.push({ chave: "banco", label: "Banco de dados", ok: true, detalhe: "Conectado" });
  } catch {
    checagens.push({ chave: "banco", label: "Banco de dados", ok: false, detalhe: "Não foi possível consultar o banco" });
  }

  // 2. Agente de IA ativo
  const agente = await prisma.agenteIa.findFirst({ where: { empresaId: ctx.empresaId, ativo: true } });
  checagens.push({
    chave: "agente",
    label: "Agente de IA",
    ok: Boolean(agente),
    detalhe: agente ? `"${agente.nome}" ativo` : "Nenhum agente ativo — configure em Configurar IA",
  });

  // 3. Gemini acessível (ping barato: lista de modelos, sem gastar tokens de geração)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    checagens.push({ chave: "ia", label: "IA (Gemini)", ok: false, detalhe: "GEMINI_API_KEY não configurada — rodando em modo demo" });
  } else {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {
        signal: AbortSignal.timeout(5000),
      });
      checagens.push({
        chave: "ia",
        label: "IA (Gemini)",
        ok: res.ok,
        detalhe: res.ok ? "Respondendo normalmente" : `API respondeu ${res.status}`,
      });
    } catch {
      checagens.push({ chave: "ia", label: "IA (Gemini)", ok: false, detalhe: "Tempo esgotado ou sem conexão" });
    }
  }

  // 4. WhatsApp — worker (Baileys) se a empresa tiver sessão conectada, senão modo configurado via env
  const sessao = await prisma.whatsappSessao.findUnique({ where: { empresaId: ctx.empresaId } });
  const workerUrl = process.env.WHATSAPP_WORKER_URL;
  const workerSecret = process.env.WHATSAPP_WORKER_SECRET;
  if (sessao?.status === "conectado" && workerUrl && workerSecret) {
    try {
      const res = await fetch(`${workerUrl}/sessions/${ctx.empresaId}/status`, {
        headers: { "x-worker-secret": workerSecret },
        signal: AbortSignal.timeout(5000),
      });
      const data = res.ok ? ((await res.json().catch(() => null)) as { conectado?: boolean } | null) : null;
      checagens.push({
        chave: "whatsapp",
        label: "WhatsApp",
        ok: res.ok && Boolean(data?.conectado),
        detalhe: res.ok
          ? data?.conectado
            ? `Conectado${sessao.numeroConectado ? ` (${sessao.numeroConectado})` : ""}`
            : "Worker respondeu, mas a sessão não está conectada"
          : `Worker respondeu ${res.status}`,
      });
    } catch {
      checagens.push({ chave: "whatsapp", label: "WhatsApp", ok: false, detalhe: "Worker do WhatsApp não respondeu (fora do ar?)" });
    }
  } else if (process.env.WHATSAPP_PROVIDER === "meta" && process.env.WHATSAPP_TOKEN) {
    checagens.push({ chave: "whatsapp", label: "WhatsApp", ok: true, detalhe: "Usando Meta Cloud API" });
  } else {
    checagens.push({
      chave: "whatsapp",
      label: "WhatsApp",
      ok: false,
      detalhe: "Nenhum WhatsApp conectado — rodando em modo simulado (Configurações → WhatsApp)",
    });
  }

  const tudoOk = checagens.every((c) => c.ok);
  return NextResponse.json({ ok: tudoOk, checagens });
}
