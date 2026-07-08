import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, randomToken, hashToken } from "@/kernel/crypto";
import { requireRole } from "@/modules/identity/guard";
import type { AuthContext } from "@/modules/identity/auth-service";

describe("kernel/crypto", () => {
  it("hashes and verifies a password (constant-time)", () => {
    const stored = hashPassword("Sup3rSecret!");
    expect(verifyPassword("Sup3rSecret!", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("produces unique salted hashes for the same password", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("hashes tokens deterministically for lookup", () => {
    const t = randomToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("identity/authz", () => {
  const ctx: AuthContext = { userId: 1, email: "a@b.com", roles: ["trader"] };

  it("allows a present role", () => {
    expect(() => requireRole(ctx, "trader")).not.toThrow();
  });

  it("rejects a missing role", () => {
    expect(() => requireRole(ctx, "admin")).toThrow();
  });
});
