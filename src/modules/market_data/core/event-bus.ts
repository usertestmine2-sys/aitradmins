// AI Arena — THE single Market Data event bus.
// Every engine publishes/subscribes through this one instance. Do not create another.
import { EventEmitter } from "node:events";
import type { ProviderName, Timeframe } from "../constants";

import { SystemEventType } from "@/lib/ops/types";

export interface TickEvent {
  symbol: string;
  exchange: string;
  ltp: number;
  volume: number;
  oi?: number;
  ts: number;
  provider: ProviderName;
}

export interface CandleEvent {
  symbol: string;
  exchange: string;
  timeframe: Timeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
  ts: number;
}

export interface QualityEvent {
  symbol: string;
  severity: "INFO" | "WARN" | "ERROR";
  code: string;
  message: string;
  ts: number;
}

export interface ProviderEvent {
  provider: ProviderName;
  state: string;
  latencyMs?: number;
  message?: string;
  ts: number;
}

export interface MarketDataEventMap {
  tick: TickEvent;
  candle: CandleEvent;
  quality: QualityEvent;
  provider: ProviderEvent;
  scanner: { type: string; matches: number; ts: number };
  corporateAction: { symbol: string; actionType: string; ts: number };
  // Platform audit signal (Phase 5) — additive, backward compatible.
  audit: { action: string; actorId?: string; target?: string; ts: number };
  // Broker Foundation signals (Phase 3A) — additive, backward compatible.
  // AITradeMinds never holds funds; these describe connectivity only.
  broker: {
    event: string; // broker.connected | broker.health.changed | ...
    broker: string;
    state?: string;
    health?: string;
    message?: string;
    ts: number;
  };
  // AI Model Training System signals (Phase 3B) — additive, backward compatible.
  training: {
    event: string; // training.started | training.completed | model.updated | ...
    modelKey?: string;
    trainingId?: string;
    version?: number;
    message?: string;
    ts: number;
  };
  // System & Operations signals (Consolidated from lib/events/bus)
  system: {
    type: SystemEventType;
    componentId?: string | null;
    payload: Record<string, unknown>;
    at: string;
  };
  ops: {
    type: string; // ops.sweep.completed | ops.component.registered | ...
    componentId?: string | null;
    payload: Record<string, unknown>;
    at: string;
  };
  platform: {
    type: SystemEventType;
    componentId?: string | null;
    payload?: Record<string, unknown>;
    at: string;
  };
  // Trading signals (Phase 7) — portfolio/order/position/risk/execution.
  trading: {
    event: string; // order.created | order.filled | risk.rejected | position.closed | ...
    accountId?: number;
    orderId?: number;
    symbol?: string;
    message?: string;
    ts: number;
  };
}

type EventName = keyof MarketDataEventMap;

// Phase 4 extension point: pluggable transport for cross-process delivery.
// Default (in-proc) delivery is unchanged; a RedisStreamsTransport can be
// attached later without touching any engine. Do NOT create a second bus.
export interface BusTransport {
  readonly name: string;
  forward(event: string, payload: unknown): void;
  start(sink: (event: string, payload: unknown) => void): void;
  stop(): void;
}

class MarketDataEventBus {
  private readonly emitter = new EventEmitter();
  private readonly counters = new Map<EventName, number>();
  private transport?: BusTransport;

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  /** Attach a distributed transport. Inbound remote events are delivered locally. */
  attachTransport(transport: BusTransport): void {
    this.transport = transport;
    transport.start((event, payload) =>
      this.emitter.emit(event, payload as MarketDataEventMap[EventName]),
    );
  }

  transportName(): string | null {
    return this.transport?.name ?? null;
  }

  publish<K extends EventName>(event: K, payload: MarketDataEventMap[K]): void {
    this.counters.set(event, (this.counters.get(event) ?? 0) + 1);
    this.emitter.emit(event, payload);
    // Best-effort fan-out to other processes when a transport is attached.
    this.transport?.forward(event, payload);
  }

  subscribe<K extends EventName>(
    event: K,
    handler: (payload: MarketDataEventMap[K]) => void,
  ): () => void {
    this.emitter.on(event, handler as (payload: unknown) => void);
    return () => this.emitter.off(event, handler as (payload: unknown) => void);
  }

  once<K extends EventName>(
    event: K,
    handler: (payload: MarketDataEventMap[K]) => void,
  ): void {
    this.emitter.once(event, handler as (payload: unknown) => void);
  }

  metrics(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }

  stats() {
    return {
      published: [...this.counters.values()].reduce((a, b) => a + b, 0),
      delivered: [...this.counters.values()].reduce((a, b) => a + b, 0), // best effort
      dropped: 0,
      subscribers: this.emitter.eventNames().length,
    };
  }
}

const globalForBus = globalThis as typeof globalThis & {
  __arenaMarketEventBus?: MarketDataEventBus;
};

export const eventBus: MarketDataEventBus =
  globalForBus.__arenaMarketEventBus ?? new MarketDataEventBus();

if (!globalForBus.__arenaMarketEventBus) {
  globalForBus.__arenaMarketEventBus = eventBus;
}
