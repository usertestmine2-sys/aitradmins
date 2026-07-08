import { describe, it, expect } from "vitest";
import { enforceRateLimit } from "@/modules/security/rate-limit";
import { AppError } from "@/kernel/errors";

describe("security/rate-limit", () => {
  it("allows requests up to the limit then blocks", () => {
    const key = `test:${Math.random()}`;
    expect(() => enforceRateLimit(key, 3, 10_000)).not.toThrow();
    expect(() => enforceRateLimit(key, 3, 10_000)).not.toThrow();
    expect(() => enforceRateLimit(key, 3, 10_000)).not.toThrow();
    try {
      enforceRateLimit(key, 3, 10_000);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("RATE_LIMITED");
    }
  });
});
