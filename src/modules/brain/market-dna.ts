// AITradeMinds — Market DNA. Fingerprints recurring market behaviour and enables
// historical similarity search. Reuses Market Data repository + indicators.
import { singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import { repository } from "@/modules/market_data/core/repository";
import { historicalManager } from "@/modules/market_data/services/historical";
import { atr, rsi, ema, last, type Bar } from "@/modules/market_data/indicators/indicators";
import type { Timeframe } from "@/modules/market_data/constants";
import { brainRepository } from "./repository";

export type DnaPattern =
  | "TRENDING_UP"
  | "TRENDING_DOWN"
  | "RANGE"
  | "BREAKOUT"
  | "FAKE_BREAKOUT"
  | "GAP_UP"
  | "GAP_DOWN"
  | "PANIC_SELLING"
  | "NEWS_DRIVEN";

// Build a normalized fingerprint vector from a window of bars.
function fingerprint(bars: Bar[]): number[] {
  const closes = bars.map((b) => b.close);
  const rets = closes.map((c, i) => (i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]));
  const meanRet = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const vol = Math.sqrt(rets.reduce((a, b) => a + (b - meanRet) ** 2, 0) / (rets.length || 1));
  const rangePct =
    (Math.max(...bars.map((b) => b.high)) - Math.min(...bars.map((b) => b.low))) /
    (closes[closes.length - 1] || 1);
  const rsiVal = last(rsi(closes)) / 100;
  const emaSpread = (() => {
    const e = last(ema(closes, Math.min(10, closes.length - 1)));
    const c = closes[closes.length - 1];
    return Number.isNaN(e) || c === 0 ? 0 : (c - e) / c;
  })();
  const atrPct = last(atr(bars)) / (closes[closes.length - 1] || 1);
  return [
    +meanRet.toFixed(6),
    +vol.toFixed(6),
    +rangePct.toFixed(6),
    +(Number.isNaN(rsiVal) ? 0.5 : rsiVal).toFixed(6),
    +emaSpread.toFixed(6),
    +(Number.isNaN(atrPct) ? 0 : atrPct).toFixed(6),
  ];
}

function classify(fp: number[]): DnaPattern {
  const [meanRet, vol, rangePct, , emaSpread] = fp;
  if (vol > 0.03 && meanRet < -0.01) return "PANIC_SELLING";
  if (meanRet > 0.005 && emaSpread > 0.02) return "TRENDING_UP";
  if (meanRet < -0.005 && emaSpread < -0.02) return "TRENDING_DOWN";
  if (rangePct > 0.08 && Math.abs(meanRet) > 0.01) return "BREAKOUT";
  if (rangePct < 0.03) return "RANGE";
  return meanRet >= 0 ? "GAP_UP" : "GAP_DOWN";
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

class MarketDna {
  private window = 20;

  /** Extract and persist Market DNA fingerprints across a symbol's history. */
  async extract(symbol: string, timeframe: Timeframe): Promise<{ generated: number }> {
    const candles = await repository.getCandles(symbol, timeframe, { limit: 1000 });
    const bars = historicalManager.toBars(candles);
    if (bars.length < this.window + 5) return { generated: 0 };

    let generated = 0;
    for (let i = this.window; i < bars.length - 5; i += this.window) {
      const window = bars.slice(i - this.window, i);
      const fp = fingerprint(window);
      const pattern = classify(fp);
      const fwd = (bars[i + 5].close - bars[i].close) / bars[i].close;
      await brainRepository.saveDna({
        symbol,
        timeframe,
        ts: new Date(bars[i].ts),
        pattern,
        regime: pattern,
        fingerprint: fp,
        forwardReturn: +fwd.toFixed(6),
      });
      generated += 1;
    }
    eventBus.publish("training", {
      event: "brain.dna.generated",
      message: `${symbol} ${generated} fingerprints`,
      ts: Date.now(),
    });
    return { generated };
  }

  /** Find the most similar historical DNA to the current market window. */
  async similar(
    symbol: string,
    timeframe: Timeframe,
    topK = 5,
  ): Promise<
    Array<{ ts: string; pattern: string; distance: number; forwardReturn: number | null }>
  > {
    const candles = await repository.getCandles(symbol, timeframe, { limit: this.window + 5 });
    const bars = historicalManager.toBars(candles);
    if (bars.length < this.window) return [];
    const current = fingerprint(bars.slice(-this.window));

    const history = await brainRepository.dnaForSymbol(symbol, 500);
    return history
      .map((h) => ({
        ts: h.ts.toISOString(),
        pattern: h.pattern,
        distance: +euclidean(current, h.fingerprint).toFixed(6),
        forwardReturn: h.forwardReturn,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, topK);
  }
}

export const marketDna = singleton("brain.marketDna", () => new MarketDna());
