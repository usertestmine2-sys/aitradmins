// AITradeMinds — Security Kernel. Production-grade hashing + secret management.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64, SCRYPT_PARAMS);
  return `${salt}:${buf.toString("hex")}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const buf = scryptSync(password, salt, 64, SCRYPT_PARAMS);
  return timingSafeEqual(Buffer.from(key, "hex"), buf);
}

export function hashToken(token: string): string {
  // Simple HMAC-SHA256 for session/API key tokens
  return require("node:crypto").createHmac("sha256", process.env.AUTH_SECRET!).update(token).digest("hex");
}
