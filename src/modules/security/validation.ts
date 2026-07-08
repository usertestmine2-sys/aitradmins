// AITradeMinds — Security: input validation. Single zod-based gateway.
import type { ZodType } from "zod";
import { errors } from "@/kernel/errors";

/** Parse+validate a JSON request body; throws AppError(VALIDATION) on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw errors.badRequest("Invalid JSON body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw errors.validation("Validation failed", result.error.issues);
  }
  return result.data;
}

/** Parse+validate URL query params. */
export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw errors.validation("Invalid query parameters", result.error.issues);
  }
  return result.data;
}
