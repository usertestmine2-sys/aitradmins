// AITradeMinds — Security: rate limiter. Fixed-window counter over the SINGLE cache.
// No parallel store — reuses the market_data cache instance.
import { errors } from "@/kernel/errors";
import { cache } from "@/modules/market_data/core/cache";

const NS = "ratelimit";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Enforce `limit` requests per `windowMs` for a key (e.g. ip:route).
 * Throws AppError(RATE_LIMITED) when exceeded.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = cache.get<Window>(NS, key);
  if (!existing || existing.resetAt <= now) {
    cache.set<Window>(NS, key, { count: 1, resetAt: now + windowMs }, windowMs);
    return;
  }
  if (existing.count >= limit) {
    throw errors.rateLimited(`Rate limit exceeded (${limit}/${Math.round(windowMs / 1000)}s)`);
  }
  existing.count += 1;
  cache.set<Window>(NS, key, existing, Math.max(1, existing.resetAt - now));
}

/** Derive a client key from request headers (best-effort IP). */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
