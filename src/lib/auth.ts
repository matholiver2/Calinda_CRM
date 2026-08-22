import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE } from "@/lib/authCookie";

export { AUTH_COOKIE };

const JWT_SECRET = process.env.JWT_SECRET || "assiz-crm-dev-secret";
const JWT_EXPIRES_IN = "7d";

export type Papel = "super_admin" | "admin" | "gestor" | "vendedor";

export type SessionPayload = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string | null;
};

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
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
