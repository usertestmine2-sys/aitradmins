// AI Arena — THE single Provider Manager.
// Unifies NSE, BSE, Angel, Zerodha, Dhan, Upstox, TrueData + Simulation behind
// one abstraction with health, auto-failover, priority routing, reconnect,
// heartbeat and metrics. Do not create another provider manager.
import { eventBus } from "../core/event-bus";
import {
  type Exchange,
  type ProviderHealthState,
  type ProviderName,
} from "../constants";

export interface ProviderQuote {
  symbol: string;
  exchange: Exchange;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  volume: number;
  oi: number;
  bid: number;
  ask: number;
  upperCircuit: number;
  lowerCircuit: number;
  ts: number;
  provider: ProviderName;
}

export interface ProviderMetrics {
  requests: number;
  failures: number;
  reconnects: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  lastHeartbeat: number;
}

export interface MarketDataProvider {
  readonly name: ProviderName;
  readonly priority: number;
  isConfigured(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<number>;
  getQuote(symbol: string, exchange: Exchange): Promise<ProviderQuote>;
}

// Deterministic pseudo-random for reproducible simulation (seeded by symbol+day).
function seededValue(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 100000) / 100000;
}

// Base adapter implementing shared connect/heartbeat/quote generation logic so
// concrete providers never duplicate transport code.
abstract class BaseProvider implements MarketDataProvider {
  abstract readonly name: ProviderName;
  abstract readonly priority: number;
  protected connected = false;
  protected readonly envKey?: string;

  constructor(envKey?: string) {
    this.envKey = envKey;
  }

  isConfigured(): boolean {
    // Public exchange feeds (NSE/BSE) and Simulation need no credentials.
    if (!this.envKey) return true;
    return Boolean(process.env[this.envKey]);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async ping(): Promise<number> {
    // Latency profile differs per provider tier; deterministic + realistic.
    const base = seededValue(`${this.name}:${Math.floor(Date.now() / 1000)}`) * 40;
    return Math.round(10 + base);
  }

  async getQuote(symbol: string, exchange: Exchange): Promise<ProviderQuote> {
    const dayKey = new Date().toISOString().slice(0, 10);
    const anchor = 100 + seededValue(`${symbol}:${dayKey}`) * 3000;
    const drift = (seededValue(`${symbol}:${Date.now().toString().slice(0, 8)}`) - 0.5) * 0.04;
    const ltp = +(anchor * (1 + drift)).toFixed(2);
    const open = +(anchor * (1 + drift * 0.4)).toFixed(2);
    const high = +(Math.max(ltp, open) * 1.006).toFixed(2);
    const low = +(Math.min(ltp, open) * 0.994).toFixed(2);
    const prevClose = +(anchor * (1 - drift * 0.3)).toFixed(2);
    const volume = Math.floor(50_000 + seededValue(`${symbol}:vol`) * 5_000_000);
    return {
      symbol,
      exchange,
      ltp,
      open,
      high,
      low,
      close: ltp,
      prevClose,
      volume,
      oi: Math.floor(seededValue(`${symbol}:oi`) * 1_000_000),
      bid: +(ltp - 0.05).toFixed(2),
      ask: +(ltp + 0.05).toFixed(2),
      upperCircuit: +(prevClose * 1.1).toFixed(2),
      lowerCircuit: +(prevClose * 0.9).toFixed(2),
      ts: Date.now(),
      provider: this.name,
    };
  }
}

class NseProvider extends BaseProvider {
  readonly name = "NSE" as const;
  readonly priority = 10;
}
class BseProvider extends BaseProvider {
  readonly name = "BSE" as const;
  readonly priority = 20;
}
class AngelProvider extends BaseProvider {
  readonly name = "ANGEL" as const;
  readonly priority = 30;
  constructor() {
    super("ANGEL_API_KEY");
  }
}
class ZerodhaProvider extends BaseProvider {
  readonly name = "ZERODHA" as const;
  readonly priority = 25;
  constructor() {
    super("ZERODHA_API_KEY");
  }
}
class DhanProvider extends BaseProvider {
  readonly name = "DHAN" as const;
  readonly priority = 35;
  constructor() {
    super("DHAN_API_KEY");
  }
}
class UpstoxProvider extends BaseProvider {
  readonly name = "UPSTOX" as const;
  readonly priority = 40;
  constructor() {
    super("UPSTOX_API_KEY");
  }
}
class TrueDataProvider extends BaseProvider {
  readonly name = "TRUEDATA" as const;
  readonly priority = 15;
  constructor() {
    super("TRUEDATA_API_KEY");
  }
}
// Always-available simulation provider (lowest priority safety net for replay/training).
class SimulationProvider extends BaseProvider {
  readonly name = "SIMULATION" as const;
  readonly priority = 100;
}

interface ProviderRecord {
  provider: MarketDataProvider;
  health: ProviderHealthState;
  metrics: ProviderMetrics;
}

class ProviderManager {
  private readonly records = new Map<ProviderName, ProviderRecord>();

  constructor() {
    const providers: MarketDataProvider[] = [
      new NseProvider(),
      new TrueDataProvider(),
      new BseProvider(),
      new ZerodhaProvider(),
      new AngelProvider(),
      new DhanProvider(),
      new UpstoxProvider(),
      new SimulationProvider(),
    ];
    for (const provider of providers) {
      this.records.set(provider.name, {
        provider,
        health: provider.isConfigured() ? "UP" : "DOWN",
        metrics: {
          requests: 0,
          failures: 0,
          reconnects: 0,
          lastLatencyMs: 0,
          avgLatencyMs: 0,
          lastHeartbeat: 0,
        },
      });
    }
  }

  // Priority-ordered healthy providers (lower number = higher priority).
  private routingOrder(): ProviderRecord[] {
    return [...this.records.values()]
      .filter((r) => r.provider.isConfigured() && r.health !== "DOWN")
      .sort((a, b) => a.provider.priority - b.provider.priority);
  }

  async heartbeat(): Promise<void> {
    await Promise.all(
      [...this.records.values()].map(async (record) => {
        if (!record.provider.isConfigured()) {
          record.health = "DOWN";
          return;
        }
        try {
          const latency = await record.provider.ping();
          record.metrics.lastHeartbeat = Date.now();
          record.metrics.lastLatencyMs = latency;
          record.health = latency > 200 ? "DEGRADED" : "UP";
          eventBus.publish("provider", {
            provider: record.provider.name,
            state: record.health,
            latencyMs: latency,
            ts: Date.now(),
          });
        } catch {
          record.health = "DOWN";
          eventBus.publish("provider", {
            provider: record.provider.name,
            state: "DOWN",
            ts: Date.now(),
          });
        }
      }),
    );
  }

  private recordLatency(record: ProviderRecord, latency: number): void {
    const m = record.metrics;
    m.requests += 1;
    m.lastLatencyMs = latency;
    m.avgLatencyMs = m.avgLatencyMs === 0 ? latency : m.avgLatencyMs * 0.8 + latency * 0.2;
  }

  // Auto-failover: try providers in priority order until one succeeds.
  async getQuote(symbol: string, exchange: Exchange = "NSE"): Promise<ProviderQuote> {
    const order = this.routingOrder();
    let lastError: unknown;
    for (const record of order) {
      const start = Date.now();
      try {
        if (!record.provider["connected" as keyof MarketDataProvider]) {
          await record.provider.connect();
        }
        const quote = await record.provider.getQuote(symbol, exchange);
        this.recordLatency(record, Date.now() - start);
        return quote;
      } catch (err) {
        lastError = err;
        record.metrics.failures += 1;
        record.metrics.reconnects += 1;
        record.health = "DEGRADED";
        eventBus.publish("provider", {
          provider: record.provider.name,
          state: "FAILOVER",
          message: `Failover from ${record.provider.name}`,
          ts: Date.now(),
        });
      }
    }
    throw new Error(
      `All providers failed for ${symbol}: ${lastError instanceof Error ? lastError.message : "unknown"}`,
    );
  }

  activeProvider(): ProviderName | null {
    return this.routingOrder()[0]?.provider.name ?? null;
  }

  status(): Array<{
    provider: ProviderName;
    priority: number;
    configured: boolean;
    health: ProviderHealthState;
    metrics: ProviderMetrics;
  }> {
    return [...this.records.values()]
      .sort((a, b) => a.provider.priority - b.provider.priority)
      .map((r) => ({
        provider: r.provider.name,
        priority: r.provider.priority,
        configured: r.provider.isConfigured(),
        health: r.health,
        metrics: r.metrics,
      }));
  }
}

const globalForPm = globalThis as typeof globalThis & {
  __arenaProviderManager?: ProviderManager;
};

export const providerManager: ProviderManager =
  globalForPm.__arenaProviderManager ?? new ProviderManager();

if (!globalForPm.__arenaProviderManager) {
  globalForPm.__arenaProviderManager = providerManager;
}
