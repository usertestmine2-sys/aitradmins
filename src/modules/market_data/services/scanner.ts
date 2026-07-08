// AI Arena — Scanner Engine. Reuses repository, indicators, provider manager.
import { CACHE_NS, CACHE_TTL, type ScannerType } from "../constants";
import { cache } from "../core/cache";
import { eventBus } from "../core/event-bus";
import { repository } from "../core/repository";
import { providerManager } from "../providers/provider-manager";
import {
  atr,
  ema,
  last,
  rsi,
  vwap,
  type Bar,
} from "../indicators/indicators";

export interface ScanMatch {
  symbol: string;
  value: number;
  detail: string;
}

export interface ScanResult {
  type: ScannerType;
  matches: ScanMatch[];
  scanned: number;
  ts: number;
}

interface Snapshot {
  symbol: string;
  bars: Bar[];
  ltp: number;
  prevClose: number;
  open: number;
  volume: number;
  upperCircuit: number;
  lowerCircuit: number;
}

class ScannerEngine {
  private async snapshot(symbol: string): Promise<Snapshot | null> {
    const quote = await providerManager.getQuote(symbol, "NSE");
    const candles = await repository.getCandles(symbol, "1D", { limit: 300 });
    const bars: Bar[] = candles.map((c) => ({
      ts: c.ts.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
    // Ensure at least the live bar is present for intraday scans.
    bars.push({
      ts: quote.ts,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.ltp,
      volume: quote.volume,
    });
    return {
      symbol,
      bars,
      ltp: quote.ltp,
      prevClose: quote.prevClose,
      open: quote.open,
      volume: quote.volume,
      upperCircuit: quote.upperCircuit,
      lowerCircuit: quote.lowerCircuit,
    };
  }

  private evaluate(type: ScannerType, s: Snapshot): ScanMatch | null {
    const changePct = ((s.ltp - s.prevClose) / s.prevClose) * 100;
    switch (type) {
      case "VOLUME_BREAKOUT": {
        const avgVol =
          s.bars.slice(-21, -1).reduce((a, b) => a + b.volume, 0) / Math.max(1, s.bars.length - 1);
        if (avgVol > 0 && s.volume > avgVol * 2)
          return { symbol: s.symbol, value: +(s.volume / avgVol).toFixed(2), detail: "Vol > 2x avg" };
        return null;
      }
      case "PRICE_BREAKOUT": {
        const hi = Math.max(...s.bars.slice(-21, -1).map((b) => b.high));
        if (s.ltp > hi) return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "20D high break" };
        return null;
      }
      case "MOMENTUM": {
        const r = last(rsi(s.bars.map((b) => b.close)));
        if (r > 65) return { symbol: s.symbol, value: +r.toFixed(1), detail: "RSI momentum" };
        return null;
      }
      case "VWAP": {
        const v = last(vwap(s.bars.slice(-75)));
        if (s.ltp > v) return { symbol: s.symbol, value: +v.toFixed(2), detail: "Above VWAP" };
        return null;
      }
      case "GAP": {
        const gap = ((s.open - s.prevClose) / s.prevClose) * 100;
        if (Math.abs(gap) > 1)
          return { symbol: s.symbol, value: +gap.toFixed(2), detail: `${gap > 0 ? "Gap up" : "Gap down"}` };
        return null;
      }
      case "DELIVERY": {
        if (s.volume > 1_000_000)
          return { symbol: s.symbol, value: s.volume, detail: "High delivery volume" };
        return null;
      }
      case "OI": {
        if (changePct > 0 && s.volume > 500_000)
          return { symbol: s.symbol, value: +changePct.toFixed(2), detail: "OI buildup proxy" };
        return null;
      }
      case "HIGH_52W": {
        const hi = Math.max(...s.bars.map((b) => b.high));
        if (s.ltp >= hi) return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "52W high" };
        return null;
      }
      case "LOW_52W": {
        const lo = Math.min(...s.bars.map((b) => b.low));
        if (s.ltp <= lo) return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "52W low" };
        return null;
      }
      case "UPPER_CIRCUIT":
        if (s.ltp >= s.upperCircuit)
          return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "Upper circuit" };
        return null;
      case "LOWER_CIRCUIT":
        if (s.ltp <= s.lowerCircuit)
          return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "Lower circuit" };
        return null;
      case "OPENING_RANGE": {
        const first15 = s.bars.slice(0, 15);
        if (first15.length === 0) return null;
        const orHigh = Math.max(...first15.map((b) => b.high));
        if (s.ltp > orHigh)
          return { symbol: s.symbol, value: +s.ltp.toFixed(2), detail: "ORB breakout" };
        return null;
      }
      case "INTRADAY_STRENGTH": {
        const range = Math.max(...s.bars.slice(-1).map((b) => b.high - b.low), 0.01);
        const strength = ((s.ltp - s.open) / range) * 100;
        if (strength > 50)
          return { symbol: s.symbol, value: +strength.toFixed(1), detail: "Strong close vs range" };
        return null;
      }
      case "RELATIVE_STRENGTH": {
        const closes = s.bars.map((b) => b.close);
        const fast = last(ema(closes, 10));
        const slow = last(ema(closes, 30));
        if (fast > slow)
          return { symbol: s.symbol, value: +(fast - slow).toFixed(2), detail: "EMA10 > EMA30" };
        return null;
      }
      case "CUSTOM":
        return null;
    }
  }

  async scan(type: ScannerType, universe?: string[]): Promise<ScanResult> {
    const cacheId = `${type}:${(universe ?? ["ALL"]).join(",")}`;
    return cache.getOrSet(CACHE_NS.scanner, cacheId, CACHE_TTL.scanner, async () => {
      const symbols =
        universe ??
        (await repository.listSymbols({ instrumentType: "EQ", limit: 60 })).map((s) => s.symbol);
      const matches: ScanMatch[] = [];
      for (const symbol of symbols) {
        const snap = await this.snapshot(symbol);
        if (!snap) continue;
        const m = this.evaluate(type, snap);
        if (m) matches.push(m);
      }
      matches.sort((a, b) => b.value - a.value);
      eventBus.publish("scanner", { type, matches: matches.length, ts: Date.now() });
      return { type, matches, scanned: symbols.length, ts: Date.now() };
    });
  }

  // Custom Scanner API: user-supplied predicate over computed metrics.
  async customScan(
    universe: string[],
    predicate: (metrics: {
      symbol: string;
      ltp: number;
      changePct: number;
      rsi: number;
      vwap: number;
      atr: number;
      volume: number;
    }) => boolean,
  ): Promise<ScanResult> {
    const matches: ScanMatch[] = [];
    for (const symbol of universe) {
      const snap = await this.snapshot(symbol);
      if (!snap) continue;
      const closes = snap.bars.map((b) => b.close);
      const metrics = {
        symbol,
        ltp: snap.ltp,
        changePct: ((snap.ltp - snap.prevClose) / snap.prevClose) * 100,
        rsi: last(rsi(closes)),
        vwap: last(vwap(snap.bars.slice(-75))),
        atr: last(atr(snap.bars)),
        volume: snap.volume,
      };
      if (predicate(metrics))
        matches.push({ symbol, value: +metrics.changePct.toFixed(2), detail: "Custom match" });
    }
    return { type: "CUSTOM", matches, scanned: universe.length, ts: Date.now() };
  }
}

export const scannerEngine = new ScannerEngine();
