// AI Arena — THE single Market Data cache (namespaced, TTL-based, in-process).
// Do not create a parallel cache. Every engine reuses this instance.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
  l2Hits: number;
  l2: string | null;
}

// Phase 4 extension point: L2 tier (e.g. Redis). L1 remains authoritative and
// synchronous; L2 is consulted only in async getOrSet. Do NOT create a second cache.
export interface CacheTier {
  readonly name: string;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MarketDataCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private evictions = 0;
  private l2Hits = 0;
  private l2?: CacheTier;

  private key(ns: string, id: string): string {
    return `${ns}::${id}`;
  }

  /** Attach a shared L2 tier for cross-instance reads/invalidation. */
  attachL2(tier: CacheTier): void {
    this.l2 = tier;
  }

  get<T>(ns: string, id: string): T | undefined {
    const k = this.key(ns, id);
    const entry = this.store.get(k);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(k);
      this.evictions += 1;
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(ns: string, id: string, value: T, ttlMs: number): void {
    this.store.set(this.key(ns, id), { value, expiresAt: Date.now() + ttlMs });
    this.sets += 1;
  }

  async getOrSet<T>(
    ns: string,
    id: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(ns, id);
    if (cached !== undefined) return cached;
    // L2 lookup (shared across instances) before hitting the loader.
    if (this.l2) {
      const k = this.key(ns, id);
      const l2Value = await this.l2.get<T>(k);
      if (l2Value !== undefined) {
        this.l2Hits += 1;
        this.set(ns, id, l2Value, ttlMs);
        return l2Value;
      }
    }
    const value = await loader();
    this.set(ns, id, value, ttlMs);
    if (this.l2) await this.l2.set(this.key(ns, id), value, ttlMs);
    return value;
  }

  invalidate(ns: string, id?: string): void {
    if (id) {
      this.store.delete(this.key(ns, id));
      void this.l2?.del(this.key(ns, id));
      return;
    }
    const prefix = `${ns}::`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  purgeExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt <= now) {
        this.store.delete(k);
        removed += 1;
        this.evictions += 1;
      }
    }
    return removed;
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      size: this.store.size,
      l2Hits: this.l2Hits,
      l2: this.l2?.name ?? null,
    };
  }
}

const globalForCache = globalThis as typeof globalThis & {
  __arenaMarketCache?: MarketDataCache;
};

export const cache: MarketDataCache =
  globalForCache.__arenaMarketCache ?? new MarketDataCache();

if (!globalForCache.__arenaMarketCache) {
  globalForCache.__arenaMarketCache = cache;
}
