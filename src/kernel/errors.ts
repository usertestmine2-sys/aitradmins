// AITradeMinds — Kernel Errors. Unified taxonomy + HTTP envelope.
// New modules use these; legacy market_data/http.ts remains valid (backward compatible).
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL";

const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  VALIDATION: 422,
  DEPENDENCY_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.isOperational = isOperational;
    this.details = details;
  }
}

export const errors = {
  badRequest: (m: string, d?: unknown) => new AppError("BAD_REQUEST", m, d),
  unauthorized: (m = "Unauthorized") => new AppError("UNAUTHORIZED", m),
  forbidden: (m = "Forbidden") => new AppError("FORBIDDEN", m),
  notFound: (m = "Not found") => new AppError("NOT_FOUND", m),
  conflict: (m: string, d?: unknown) => new AppError("CONFLICT", m, d),
  rateLimited: (m = "Too many requests") => new AppError("RATE_LIMITED", m),
  validation: (m: string, d?: unknown) => new AppError("VALIDATION", m, d),
  dependencyUnavailable: (m: string) => new AppError("DEPENDENCY_UNAVAILABLE", m),
  internal: (m = "Internal error", d?: unknown) => new AppError("INTERNAL", m, d, false),
};

/** Uniform success/error envelope (aligns with legacy http.ts shape). */
export function toResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      { ok: false, error: err.message, code: err.code, details: err.details ?? null },
      { status: err.httpStatus },
    );
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return Response.json({ ok: false, error: message, code: "INTERNAL" }, { status: 500 });
}

export function okResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}
