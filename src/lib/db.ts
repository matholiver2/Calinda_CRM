import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Cachear em globalThis também em produção (não só dev) — em serverless
// (Vercel), cada invocação que não reaproveita isso cria um PrismaClient
// novo com o próprio pool de conexões, multiplicando quantas conexões
// batem no pooler do Supabase ao mesmo tempo. Combinado com CONNECTION_LIMIT
// baixo no DATABASE_URL (ver .env), isso é o que evita esgotar o pooler.
globalForPrisma.prisma = prisma;

/**
 * Jobs de longa duração (ex: polling em background) às vezes reutilizam uma
 * conexão que o pooler já derrubou por inatividade, causando P1017 ("Server
 * has closed the connection"). A query seguinte já funciona normalmente
 * (o Prisma abre uma conexão nova), então um retry simples resolve.
 */
export async function comRetryConexao<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const codigo = (err as { code?: string })?.code;
    if (codigo === "P1017") {
      return await fn();
    }
    throw err;
  }
}
