import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireSession,
  requireRole,
  isSessionResponse,
  requireEmpresaContext,
  isEmpresaContextResponse,
} from "@/lib/apiAuth";
import { TIPOS_PADRAO, REGUA_PADRAO, type ChaveTipoPadrao } from "@/lib/reguaFollowUpPadrao";

/**
 * Cria os 8 tipos de follow-up + a matriz de régua (perfil × periodicidade)
 * do modelo padrão — ponto de partida editável, não travado. Não duplica:
 * se a empresa já tem tipos com os mesmos nomes, reaproveita em vez de
 * recriar (idempotente, seguro de rodar de novo).
 */
export async function POST() {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["admin", "gestor", "super_admin"]);
  if (forbidden) return forbidden;
  const ctx = await requireEmpresaContext(session);
  if (isEmpresaContextResponse(ctx)) return ctx;

  const idPorChave = new Map<ChaveTipoPadrao, string>();

  for (const t of TIPOS_PADRAO) {
    const existente = await prisma.tipoFollowUp.findFirst({ where: { empresaId: ctx.empresaId, nome: t.nome } });
    if (existente) {
      idPorChave.set(t.chave, existente.id);
      continue;
    }
    const criado = await prisma.tipoFollowUp.create({
      data: {
        empresaId: ctx.empresaId,
        nome: t.nome,
        objetivo: t.objetivo,
        canal: t.canal,
        scriptModelo: t.scriptModelo,
        modoEnvio: "literal",
      },
    });
    idPorChave.set(t.chave, criado.id);
  }

  let criados = 0;
  for (const perfil of ["a", "b", "c"] as const) {
    for (const periodicidade of ["trimestral", "semestral", "anual"] as const) {
      for (const [diaOffset, chave] of REGUA_PADRAO[perfil][periodicidade]) {
        const tipoFollowUpId = idPorChave.get(chave);
        if (!tipoFollowUpId) continue;
        const existente = await prisma.reguaFollowUp.findUnique({
          where: { empresaId_perfil_periodicidade_diaOffset_tipoFollowUpId: { empresaId: ctx.empresaId, perfil, periodicidade, diaOffset, tipoFollowUpId } },
        });
        if (existente) continue;
        await prisma.reguaFollowUp.create({ data: { empresaId: ctx.empresaId, perfil, periodicidade, diaOffset, tipoFollowUpId } });
        criados++;
      }
    }
  }

  return NextResponse.json({ ok: true, tiposCriados: idPorChave.size, marcosCriados: criados });
}
