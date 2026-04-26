import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-please";

export type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const normalized = username.toLowerCase();
  const rows = await db.select().from(usersTable).where(eq(usersTable.username, normalized)).limit(1);
  if (rows.length === 0) return undefined;
  return {
    id: rows[0].username,
    username: rows[0].username,
    passwordHash: rows[0].passwordHash,
    createdAt: rows[0].createdAt.toISOString(),
  };
}

export async function createUser(username: string, passwordPlain: string): Promise<UserRecord> {
  const normalized = username.toLowerCase();
  const existing = await findUserByUsername(normalized);
  if (existing) {
    throw new Error("Username already taken");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordPlain, salt);

  const inserted = await db.insert(usersTable).values({
    username: normalized,
    passwordHash,
  }).returning();

  return {
    id: inserted[0].username,
    username: inserted[0].username,
    passwordHash: inserted[0].passwordHash,
    createdAt: inserted[0].createdAt.toISOString(),
  };
}

export async function verifyPassword(passwordPlain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passwordPlain, hash);
}

export function generateToken(username: string): string {
  return jwt.sign({ username: username.toLowerCase() }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { username: string };
    return payload.username;
  } catch (err) {
    return null;
  }
}
