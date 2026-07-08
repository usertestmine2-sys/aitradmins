// AITradeMinds — Kernel Logger. Structured JSON, levelled, correlation-aware, redacting.
// Zero-dependency; output is single-line JSON suitable for log shippers.
import { getContext } from "./context";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACT_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "accesstoken",
  "refreshtoken",
  "adminToken".toLowerCase(),
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v);
  }
  return out;
}

function envLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return (["debug", "info", "warn", "error"].includes(raw) ? raw : "info") as LogLevel;
}

class Logger {
  constructor(private readonly bindings: Record<string, unknown> = {}) {}

  child(bindings: Record<string, unknown>): Logger {
    return new Logger({ ...this.bindings, ...bindings });
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[envLevel()]) return;
    const ctx = getContext();
    const record = {
      ts: new Date().toISOString(),
      level,
      message,
      correlationId: ctx?.correlationId,
      userId: ctx?.userId,
      tenantId: ctx?.tenantId,
      ...this.bindings,
      ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
    };
    const line = JSON.stringify(record);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }
  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }
}

export const logger = new Logger({ service: "aitrademinds" });
export { Logger };
