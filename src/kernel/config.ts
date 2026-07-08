// AITradeMinds — Kernel Config. Typed, validated, layered, fail-fast.
// Single source of runtime configuration. Never read process.env directly elsewhere.
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Realtime backbone (optional — in-proc mode when absent).
  REDIS_URL: z.string().optional(),
  // Scheduler runs by default at runtime; opt OUT with SCHEDULER_ENABLED=false|0.
  // (The bootstrap additionally skips starting it during `next build`.)
  SCHEDULER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  // Interim admin guard until Phase 5 Auth (see Technical Debt TD-001).
  ADMIN_TOKEN: z.string().optional(),
  // Secret for signing/hashing session + API-key tokens (HMAC). Required in prod.
  AUTH_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | undefined;

/** Load + validate config once. Throws on invalid required values (fail-fast). */
export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`[config] invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only reset hook. */
export function __resetConfigForTests(): void {
  cached = undefined;
}
