// AITradeMinds — Kernel Crypto. Password hashing + token signing.
// Uses Node's built-in crypto (scrypt, HMAC-SHA256) — no external dependency.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "./config";

const SCRYPT_KEYLEN = 64;

/** Hash a password as `salt:derivedKey` (hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

/** Constant-time password verification. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

/** Opaque random token returned to clients (never stored raw). */
export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

// Secrets-vault seam. Preference order:
//   1) AUTH_SECRET env / vault (production standard),
//   2) auto-generated instance secret persisted to a gitignored keyfile.
// The keyfile pattern lets managed runtimes (which reset .env) boot securely
// without shipping a secret in source. A real Vault adapter can replace this.
let cachedSecret: string | undefined;

function authSecret(): string {
  if (cachedSecret) return cachedSecret;
  const cfg = getConfig();
  if (cfg.AUTH_SECRET) {
    cachedSecret = cfg.AUTH_SECRET;
    return cachedSecret;
  }
  const keyfile = join(process.cwd(), ".aitm-secret");
  try {
    if (existsSync(keyfile)) {
      const existing = readFileSync(keyfile, "utf8").trim();
      if (existing.length >= 32) {
        cachedSecret = existing;
        return cachedSecret;
      }
    }
    const generated = randomBytes(32).toString("hex");
    writeFileSync(keyfile, generated, { mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    // Last resort if the filesystem is read-only: ephemeral per-process secret.
    cachedSecret = randomBytes(32).toString("hex");
    return cachedSecret;
  }
}

/** HMAC hash of a token for at-rest storage/lookup (never store raw tokens). */
export function hashToken(token: string): string {
  return createHmac("sha256", authSecret()).update(token).digest("hex");
}
