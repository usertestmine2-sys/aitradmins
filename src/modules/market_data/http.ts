// AI Arena — shared HTTP helpers for the market API layer.
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Internal error", 500);
  }
}
