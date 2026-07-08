// AI Arena — Data Quality engine. Validates ticks and candles before persistence.
import { eventBus } from "../core/event-bus";
import type { TickEvent } from "../core/event-bus";

export interface QualityIssue {
  code: string;
  severity: "INFO" | "WARN" | "ERROR";
  message: string;
}

export interface QualityResult {
  ok: boolean;
  issues: QualityIssue[];
}

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ts: number;
}

class DataQuality {
  private lastPrice = new Map<string, number>();

  validateTick(tick: TickEvent): QualityResult {
    const issues: QualityIssue[] = [];

    if (!Number.isFinite(tick.ltp) || tick.ltp <= 0) {
      issues.push({ code: "PRICE_INVALID", severity: "ERROR", message: "Non-positive LTP" });
    }
    if (tick.volume < 0) {
      issues.push({ code: "VOL_NEGATIVE", severity: "ERROR", message: "Negative volume" });
    }
    if (tick.oi !== undefined && tick.oi < 0) {
      issues.push({ code: "OI_NEGATIVE", severity: "WARN", message: "Negative OI" });
    }

    const key = `${tick.exchange}:${tick.symbol}`;
    const prev = this.lastPrice.get(key);
    if (prev && prev > 0 && Number.isFinite(tick.ltp)) {
      const changePct = Math.abs((tick.ltp - prev) / prev) * 100;
      if (changePct > 25) {
        issues.push({
          code: "PRICE_SPIKE",
          severity: "WARN",
          message: `Suspicious ${changePct.toFixed(1)}% jump from ${prev}`,
        });
      }
    }
    if (Number.isFinite(tick.ltp) && tick.ltp > 0) this.lastPrice.set(key, tick.ltp);

    const now = Date.now();
    if (tick.ts > now + 60_000) {
      issues.push({ code: "TS_FUTURE", severity: "WARN", message: "Timestamp in the future" });
    }

    const result: QualityResult = {
      ok: !issues.some((i) => i.severity === "ERROR"),
      issues,
    };
    for (const issue of issues) {
      eventBus.publish("quality", {
        symbol: tick.symbol,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        ts: now,
      });
    }
    return result;
  }

  validateCandle(c: OHLC): QualityResult {
    const issues: QualityIssue[] = [];
    if (![c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0)) {
      issues.push({ code: "OHLC_INVALID", severity: "ERROR", message: "Invalid OHLC values" });
    } else {
      if (c.high < Math.max(c.open, c.close, c.low)) {
        issues.push({ code: "HIGH_INVALID", severity: "ERROR", message: "High below body" });
      }
      if (c.low > Math.min(c.open, c.close, c.high)) {
        issues.push({ code: "LOW_INVALID", severity: "ERROR", message: "Low above body" });
      }
    }
    if (c.volume < 0) {
      issues.push({ code: "VOL_NEGATIVE", severity: "ERROR", message: "Negative volume" });
    }
    return { ok: !issues.some((i) => i.severity === "ERROR"), issues };
  }

  // Detect missing candles (gaps) given expected interval seconds.
  detectGaps(candles: OHLC[], intervalSec: number): number[] {
    const gaps: number[] = [];
    for (let i = 1; i < candles.length; i += 1) {
      const diff = (candles[i].ts - candles[i - 1].ts) / 1000;
      const expected = Math.round(diff / intervalSec);
      if (expected > 1) gaps.push(candles[i - 1].ts + intervalSec * 1000);
    }
    return gaps;
  }
}

const globalForQuality = globalThis as typeof globalThis & {
  __arenaDataQuality?: DataQuality;
};

export const dataQuality: DataQuality =
  globalForQuality.__arenaDataQuality ?? new DataQuality();

if (!globalForQuality.__arenaDataQuality) {
  globalForQuality.__arenaDataQuality = dataQuality;
}
