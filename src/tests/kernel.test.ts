import { describe, it, expect } from "vitest";
import { singleton, registeredKeys } from "@/kernel/registry";
import { AppError, errors, toResponse } from "@/kernel/errors";
import { runWithContext, getContext } from "@/kernel/context";

describe("kernel/registry", () => {
  it("returns the same instance for a key (singleton guarantee)", () => {
    const a = singleton("test.svc", () => ({ id: Math.random() }));
    const b = singleton("test.svc", () => ({ id: Math.random() }));
    expect(a).toBe(b);
    expect(registeredKeys()).toContain("test.svc");
  });
});

describe("kernel/errors", () => {
  it("maps error codes to HTTP status", () => {
    expect(errors.notFound().httpStatus).toBe(404);
    expect(errors.unauthorized().httpStatus).toBe(401);
    expect(errors.validation("bad").httpStatus).toBe(422);
  });

  it("serializes AppError via toResponse", async () => {
    const res = toResponse(new AppError("CONFLICT", "dupe"));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("CONFLICT");
  });
});

describe("kernel/context", () => {
  it("propagates correlation id within a context", () => {
    runWithContext({ correlationId: "abc-123", userId: "u1" }, () => {
      const ctx = getContext();
      expect(ctx?.correlationId).toBe("abc-123");
      expect(ctx?.userId).toBe("u1");
    });
    expect(getContext()).toBeUndefined();
  });
});
