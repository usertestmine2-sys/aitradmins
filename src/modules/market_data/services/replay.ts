// AI Arena — Replay Engine. Historical/tick/training replay with speed control.
import { type Timeframe } from "../constants";
import { eventBus } from "../core/event-bus";
import { feedPipeline } from "../feed/feed-pipeline";
import { repository } from "../core/repository";
import type { MdCandle } from "@/db/schema";

export type ReplayMode = "HISTORICAL" | "TICK" | "TRAINING";
export type ReplayState = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

interface ReplaySession {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  mode: ReplayMode;
  speed: number;
  cursor: number;
  candles: MdCandle[];
  state: ReplayState;
  emitted: number;
}

class ReplayEngine {
  private readonly sessions = new Map<string, ReplaySession>();

  async create(
    symbol: string,
    timeframe: Timeframe,
    mode: ReplayMode = "HISTORICAL",
    opts: { from?: Date; to?: Date; speed?: number } = {},
  ): Promise<{ id: string; bars: number }> {
    const candles = await repository.getCandles(symbol, timeframe, {
      from: opts.from,
      to: opts.to,
      limit: 20000,
    });
    const id = `replay_${symbol}_${timeframe}_${Date.now()}`;
    this.sessions.set(id, {
      id,
      symbol,
      timeframe,
      mode,
      speed: opts.speed ?? 1,
      cursor: 0,
      candles,
      state: "IDLE",
      emitted: 0,
    });
    return { id, bars: candles.length };
  }

  setSpeed(id: string, speed: number): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.speed = Math.max(0.25, Math.min(speed, 100));
    return true;
  }

  pause(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s || s.state !== "RUNNING") return false;
    s.state = "PAUSED";
    return true;
  }

  resume(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s || s.state !== "PAUSED") return false;
    s.state = "RUNNING";
    return true;
  }

  // Step N bars forward — deterministic, drives the same event bus/feed as live.
  async step(id: string, steps = 1): Promise<{ emitted: number; done: boolean; state: ReplayState }> {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`Replay session ${id} not found`);
    if (s.state === "IDLE" || s.state === "PAUSED") s.state = "RUNNING";

    let emitted = 0;
    for (let i = 0; i < steps && s.cursor < s.candles.length; i += 1) {
      const c = s.candles[s.cursor];
      if (s.mode === "TICK") {
        // Explode candle into 4 synthetic ticks: O -> H -> L -> C.
        for (const price of [c.open, c.high, c.low, c.close]) {
          await feedPipeline.ingestTick(
            {
              symbol: s.symbol,
              exchange: c.exchange,
              ltp: price,
              volume: Math.round(c.volume / 4),
              oi: c.oi,
              ts: c.ts.getTime(),
              provider: "SIMULATION",
            },
            [s.timeframe],
          );
        }
      } else {
        eventBus.publish("candle", {
          symbol: s.symbol,
          exchange: c.exchange,
          timeframe: s.timeframe,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          oi: c.oi,
          ts: c.ts.getTime(),
        });
      }
      s.cursor += 1;
      s.emitted += 1;
      emitted += 1;
    }
    const done = s.cursor >= s.candles.length;
    if (done) s.state = "COMPLETED";
    return { emitted, done, state: s.state };
  }

  status(id: string) {
    const s = this.sessions.get(id);
    if (!s) return null;
    return {
      id: s.id,
      symbol: s.symbol,
      timeframe: s.timeframe,
      mode: s.mode,
      speed: s.speed,
      state: s.state,
      cursor: s.cursor,
      total: s.candles.length,
      emitted: s.emitted,
      progressPct: s.candles.length ? +((s.cursor / s.candles.length) * 100).toFixed(1) : 0,
    };
  }

  list() {
    return [...this.sessions.values()].map((s) => this.status(s.id));
  }
}

export const replayEngine = new ReplayEngine();
