import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole, isSessionResponse } from "@/lib/apiAuth";
import { removerTudoComPrefixo } from "@/lib/supabaseStorage";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const empresa = await prisma.empresa.update({
    where: { id },
    data: { nome: body?.nome, ativo: body?.ativo },
  });
  return NextResponse.json({ empresa });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isSessionResponse(session)) return session;
  const forbidden = requireRole(session, ["super_admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id }, select: { nome: true } });
  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada" }, { status: 404 });
  }

  // Confirmação exigida no corpo — exclusão é irreversível (usuários, leads,
  // vendas, conversas, arquivos, tudo) e não deve acontecer por engano.
  const body = await req.json().catch(() => null);
  if (body?.confirmarNome !== empresa.nome) {
    return NextResponse.json({ erro: "Confirmação não confere com o nome da empresa" }, { status: 400 });
  }

  // Não dá pra confiar só no cascade nativo do Postgres aqui: algumas
  // relações são intencionalmente "restritas" (ex: HistoricoEtapa/Lead/
  // AgenteIa -> EtapaFunil, sem cascade — é o que impede excluir uma etapa
  // do funil com histórico normalmente, ver src/app/api/etapas/[id]/route.ts)
  // e travam a exclusão em cascata da empresa. Por isso apaga tudo na mão,
  // dos mais dependentes pros menos dependentes, antes da empresa em si.
  await prisma.$transaction([
    prisma.notificacao.deleteMany({ where: { empresaId: id } }),
    prisma.mensagem.deleteMany({ where: { lead: { empresaId: id } } }),
    prisma.reuniao.deleteMany({ where: { lead: { empresaId: id } } }),
    prisma.historicoEtapa.deleteMany({ where: { lead: { empresaId: id } } }),
    prisma.orcamento.deleteMany({ where: { empresaId: id } }),
    prisma.venda.deleteMany({ where: { empresaId: id } }),
    prisma.lead.deleteMany({ where: { empresaId: id } }),
    prisma.agenteIa.deleteMany({ where: { empresaId: id } }),
    prisma.etapaFunil.deleteMany({ where: { empresaId: id } }),
    prisma.plano.deleteMany({ where: { empresaId: id } }),
    prisma.configuracao.deleteMany({ where: { empresaId: id } }),
    prisma.whatsappSessao.deleteMany({ where: { empresaId: id } }),
    prisma.convite.deleteMany({ where: { empresaId: id } }),
    prisma.arquivo.deleteMany({ where: { empresaId: id } }),
    prisma.pastaArquivo.deleteMany({ where: { empresaId: id } }),
    prisma.usuario.deleteMany({ where: { empresaId: id } }),
    prisma.empresa.delete({ where: { id } }),
  ]);

  try {
    await removerTudoComPrefixo(id);
  } catch (err) {
    // Não bloqueia a exclusão (já irreversível no banco) — só loga, já que
    // Storage pode nem estar configurado no ambiente.
    console.error(`[empresas/${id}] falha ao limpar arquivos no Storage:`, err);
  }

  return NextResponse.json({ ok: true });
}
