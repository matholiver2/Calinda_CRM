import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE } from "@/lib/authCookie";

export { AUTH_COOKIE };

const JWT_SECRET = process.env.JWT_SECRET || "assiz-crm-dev-secret";
const JWT_EXPIRES_IN = "7d";

export type Papel = "super_admin" | "admin" | "gestor" | "vendedor";

/** O que fica assinado no JWT — só identidade. Uma conta pode ter MembroEmpresa
 * em várias empresas, então papel/empresa não são fixos por conta e não entram
 * no token (ver SessionPayload/resolverSessao em src/lib/session.ts). */
export type IdentidadePayload = { id: string; nome: string; email: string };

/** O que toda rota usa de fato — já resolvido pra empresa ativa da requisição. */
export type SessionPayload = IdentidadePayload & {
  papel: Papel;
  empresaId: string | null;
};

export function signToken(payload: IdentidadePayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): IdentidadePayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as IdentidadePayload;
  } catch {
    return null;
  }
}

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
