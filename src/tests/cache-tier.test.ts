import { describe, it, expect, beforeEach } from "vitest";
import { cache } from "@/modules/market_data/core/cache";
import type { CacheTier } from "@/modules/market_data/core/cache";

// Minimal in-memory L2 to verify the extension seam (no Redis needed for the test).
class MemoryTier implements CacheTier {
  readonly name = "memory-test";
  private readonly store = new Map<string, unknown>();
  reads = 0;
  async get<T>(key: string): Promise<T | undefined> {
    this.reads += 1;
    return this.store.get(key) as T | undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("cache L2 tier extension", () => {
  beforeEach(() => {
    cache.invalidate("t2test");
  });

  it("populates and reads through the attached L2 tier", async () => {
    const tier = new MemoryTier();
    cache.attachL2(tier);

    let loaderCalls = 0;
    const load = async () => {
      loaderCalls += 1;
      return { v: 42 };
    };

    const first = await cache.getOrSet("t2test", "k", 10_000, load);
    expect(first.v).toBe(42);
    expect(loaderCalls).toBe(1);

    // Clear L1 only; L2 should now serve the value without calling loader again.
    cache.invalidate("t2test", "k");
    await tier.set("t2test::k", { v: 42 }); // reinstate in L2 (invalidate cleared it)

    const second = await cache.getOrSet("t2test", "k", 10_000, load);
    expect(second.v).toBe(42);
    expect(loaderCalls).toBe(1); // loader NOT called again — served from L2
    expect(cache.stats().l2 === "memory-test").toBe(true);
  });
});
