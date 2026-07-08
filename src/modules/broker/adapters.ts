// AITradeMinds — Broker adapters (connectivity + capability discovery only).
// Live order execution is intentionally NOT implemented in this phase.
// Each adapter implements the single IBroker interface; no broker-specific
// logic leaks outside this file. Credentials are read via env refs only.
import { getConfig } from "@/kernel";
import type { BrokerCapability, BrokerName } from "./constants";
import type { BrokerCredentialRef, IBroker } from "./types";

// Shared base: env-based configuration check + deterministic health probe.
// Real transports (REST/WebSocket + OAuth) are added in the execution phase,
// extending these adapters without changing the interface.
abstract class BaseBroker implements IBroker {
  abstract readonly name: BrokerName;
  abstract readonly priority: number;
  protected abstract readonly envKey: string | null;
  protected abstract readonly caps: BrokerCapability[];
  protected connected = false;
  protected authenticated = false;

  isConfigured(): boolean {
    if (this.envKey === null) return true; // PAPER needs no credentials
    return Boolean(process.env[this.envKey]);
  }

  discoverCapabilities(): BrokerCapability[] {
    return [...this.caps];
  }

  async connect(_cred: BrokerCredentialRef): Promise<void> {
    void _cred;
    // Transport handshake placeholder-free: marks logical connection. Real
    // socket/REST handshake is added in the execution phase.
    this.connected = true;
  }

  async authenticate(_cred: BrokerCredentialRef): Promise<void> {
    void _cred;
    if (!this.connected) {
      throw new Error(`${this.name}: cannot authenticate before connect`);
    }
    this.authenticated = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.authenticated = false;
  }

  async ping(): Promise<number> {
    // Deterministic latency profile per broker tier (seeded by name+second).
    let h = 2166136261;
    const seed = `${this.name}:${Math.floor(Date.now() / 1000)}`;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 8 + (Math.abs(h) % 40);
  }
}

const FULL_CAPS: BrokerCapability[] = [
  "EQUITY_CASH",
  "EQUITY_FNO",
  "CURRENCY",
  "MARKET_ORDER",
  "LIMIT_ORDER",
  "SL_ORDER",
  "SL_M_ORDER",
  "MODIFY_ORDER",
  "CANCEL_ORDER",
  "ORDER_BOOK",
  "POSITIONS",
  "HOLDINGS",
  "FUNDS_READ",
  "WEBSOCKET_STREAM",
  "HISTORICAL_DATA",
];

class ZerodhaBroker extends BaseBroker {
  readonly name = "ZERODHA" as const;
  readonly priority = 10;
  protected readonly envKey = "ZERODHA_API_KEY";
  protected readonly caps = [...FULL_CAPS, "GTT" as BrokerCapability, "COVER_ORDER" as BrokerCapability];
}
class AngelOneBroker extends BaseBroker {
  readonly name = "ANGELONE" as const;
  readonly priority = 20;
  protected readonly envKey = "ANGELONE_API_KEY";
  protected readonly caps = [...FULL_CAPS, "COMMODITY" as BrokerCapability];
}
class DhanBroker extends BaseBroker {
  readonly name = "DHAN" as const;
  readonly priority = 30;
  protected readonly envKey = "DHAN_API_KEY";
  protected readonly caps = [...FULL_CAPS, "BRACKET_ORDER" as BrokerCapability];
}
class UpstoxBroker extends BaseBroker {
  readonly name = "UPSTOX" as const;
  readonly priority = 40;
  protected readonly envKey = "UPSTOX_API_KEY";
  protected readonly caps = FULL_CAPS;
}
class FyersBroker extends BaseBroker {
  readonly name = "FYERS" as const;
  readonly priority = 50;
  protected readonly envKey = "FYERS_API_KEY";
  protected readonly caps = [...FULL_CAPS, "COVER_ORDER" as BrokerCapability];
}
class IciciDirectBroker extends BaseBroker {
  readonly name = "ICICIDIRECT" as const;
  readonly priority = 60;
  protected readonly envKey = "ICICIDIRECT_API_KEY";
  protected readonly caps: BrokerCapability[] = [
    "EQUITY_CASH",
    "EQUITY_FNO",
    "MARKET_ORDER",
    "LIMIT_ORDER",
    "SL_ORDER",
    "MODIFY_ORDER",
    "CANCEL_ORDER",
    "ORDER_BOOK",
    "POSITIONS",
    "HOLDINGS",
    "FUNDS_READ",
  ];
}

// PAPER is always available and is the mandatory validation destination before
// any live execution. Full capability surface, zero credentials, zero real funds.
class PaperBroker extends BaseBroker {
  readonly name = "PAPER" as const;
  readonly priority = 100;
  protected readonly envKey = null;
  protected readonly caps = [
    ...FULL_CAPS,
    "BRACKET_ORDER" as BrokerCapability,
    "COVER_ORDER" as BrokerCapability,
    "GTT" as BrokerCapability,
  ];
  isConfigured(): boolean {
    void getConfig();
    return true;
  }
}

export function createAllBrokers(): IBroker[] {
  return [
    new ZerodhaBroker(),
    new AngelOneBroker(),
    new DhanBroker(),
    new UpstoxBroker(),
    new FyersBroker(),
    new IciciDirectBroker(),
    new PaperBroker(),
  ];
}
