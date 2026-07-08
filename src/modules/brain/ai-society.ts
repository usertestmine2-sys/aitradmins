// AITradeMinds — AI Society. Specialized independent agents, each with ONE
// responsibility, each emitting an opinion from REAL indicators. No agent modifies
// another; the Brain aggregates. Deterministic (no mock AI, no randomness).
import { singleton } from "@/kernel";
import { repository } from "@/modules/market_data/core/repository";
import { providerManager } from "@/modules/market_data/providers/provider-manager";
import { historicalManager } from "@/modules/market_data/services/historical";
import {
  adx,
  atr,
  bollinger,
  ema,
  last,
  macd,
  rsi,
  sma,
  vwap,
  type Bar,
} from "@/modules/market_data/indicators/indicators";

export type Vote = "BUY" | "SELL" | "HOLD";

export interface AgentOpinion {
  agent: string;
  vote: Vote;
  confidence: number; // 0..1
  rationale: string;
}

export interface MarketView {
  symbol: string;
  exchange: string;
  bars: Bar[];
  ltp: number;
  prevClose: number;
}

// Each agent is a pure function of the market view. One responsibility each.
type Agent = { name: string; assess: (v: MarketView) => AgentOpinion };

function opinion(agent: string, vote: Vote, confidence: number, rationale: string): AgentOpinion {
  return { agent, vote, confidence: +Math.max(0, Math.min(1, confidence)).toFixed(4), rationale };
}

const AGENTS: Agent[] = [
  {
    name: "TREND_AI",
    assess: (v) => {
      const c = v.bars.map((b) => b.close);
      const e50 = last(ema(c, 50));
      const e200 = last(sma(c, 200));
      if (Number.isNaN(e50) || Number.isNaN(e200)) return opinion("TREND_AI", "HOLD", 0.3, "insufficient history");
      const up = e50 > e200;
      const strength = Math.min(1, Math.abs(e50 - e200) / (v.ltp || 1) * 20);
      return opinion("TREND_AI", up ? "BUY" : "SELL", 0.5 + strength * 0.4, `EMA50 ${up ? ">" : "<"} SMA200`);
    },
  },
  {
    name: "MOMENTUM_AI",
    assess: (v) => {
      const r = last(rsi(v.bars.map((b) => b.close)));
      if (Number.isNaN(r)) return opinion("MOMENTUM_AI", "HOLD", 0.3, "no rsi");
      if (r > 60) return opinion("MOMENTUM_AI", "BUY", (r - 60) / 40 + 0.5, `RSI ${r.toFixed(0)}`);
      if (r < 40) return opinion("MOMENTUM_AI", "SELL", (40 - r) / 40 + 0.5, `RSI ${r.toFixed(0)}`);
      return opinion("MOMENTUM_AI", "HOLD", 0.4, `RSI neutral ${r.toFixed(0)}`);
    },
  },
  {
    name: "MEAN_REVERSION_AI",
    assess: (v) => {
      const bb = bollinger(v.bars.map((b) => b.close));
      const upper = last(bb.upper);
      const lower = last(bb.lower);
      if (Number.isNaN(upper)) return opinion("MEAN_REVERSION_AI", "HOLD", 0.3, "no bands");
      if (v.ltp <= lower) return opinion("MEAN_REVERSION_AI", "BUY", 0.7, "below lower band");
      if (v.ltp >= upper) return opinion("MEAN_REVERSION_AI", "SELL", 0.7, "above upper band");
      return opinion("MEAN_REVERSION_AI", "HOLD", 0.4, "within bands");
    },
  },
  {
    name: "BREAKOUT_AI",
    assess: (v) => {
      const win = v.bars.slice(-21, -1);
      if (win.length < 10) return opinion("BREAKOUT_AI", "HOLD", 0.3, "insufficient window");
      const hi = Math.max(...win.map((b) => b.high));
      const lo = Math.min(...win.map((b) => b.low));
      if (v.ltp > hi) return opinion("BREAKOUT_AI", "BUY", 0.75, "20D high break");
      if (v.ltp < lo) return opinion("BREAKOUT_AI", "SELL", 0.75, "20D low break");
      return opinion("BREAKOUT_AI", "HOLD", 0.4, "inside range");
    },
  },
  {
    name: "VOLATILITY_AI",
    assess: (v) => {
      const a = last(atr(v.bars));
      const atrPct = v.ltp > 0 ? a / v.ltp : 0;
      // High vol → risk-off HOLD; low vol → allow directional continuation.
      if (atrPct > 0.03) return opinion("VOLATILITY_AI", "HOLD", 0.6, `high ATR ${(atrPct * 100).toFixed(1)}%`);
      const chg = (v.ltp - v.prevClose) / (v.prevClose || 1);
      return opinion("VOLATILITY_AI", chg >= 0 ? "BUY" : "SELL", 0.5, `low vol continuation`);
    },
  },
  {
    name: "VWAP_AI",
    assess: (v) => {
      const vw = last(vwap(v.bars.slice(-75)));
      if (Number.isNaN(vw)) return opinion("VWAP_AI", "HOLD", 0.3, "no vwap");
      return opinion("VWAP_AI", v.ltp > vw ? "BUY" : "SELL", 0.55, `LTP ${v.ltp > vw ? "above" : "below"} VWAP`);
    },
  },
  {
    name: "TREND_STRENGTH_AI",
    assess: (v) => {
      const a = last(adx(v.bars));
      if (Number.isNaN(a)) return opinion("TREND_STRENGTH_AI", "HOLD", 0.3, "no adx");
      const chg = v.ltp - v.prevClose;
      if (a > 25) return opinion("TREND_STRENGTH_AI", chg >= 0 ? "BUY" : "SELL", 0.5 + Math.min(0.4, a / 100), `ADX ${a.toFixed(0)}`);
      return opinion("TREND_STRENGTH_AI", "HOLD", 0.4, `weak ADX ${a.toFixed(0)}`);
    },
  },
  {
    name: "MACD_AI",
    assess: (v) => {
      const m = macd(v.bars.map((b) => b.close));
      const hist = last(m.histogram);
      if (Number.isNaN(hist)) return opinion("MACD_AI", "HOLD", 0.3, "no macd");
      return opinion("MACD_AI", hist > 0 ? "BUY" : "SELL", 0.5 + Math.min(0.3, Math.abs(hist) / (v.ltp || 1) * 50), `MACD hist ${hist > 0 ? "+" : "-"}`);
    },
  },
  {
    name: "RISK_AI",
    assess: (v) => {
      // Risk agent can only counsel caution (HOLD) or confirm — never over-lever.
      const a = last(atr(v.bars));
      const atrPct = v.ltp > 0 ? a / v.ltp : 0;
      const gap = Math.abs((v.ltp - v.prevClose) / (v.prevClose || 1));
      if (atrPct > 0.04 || gap > 0.05) return opinion("RISK_AI", "HOLD", 0.8, "elevated risk / gap");
      return opinion("RISK_AI", "HOLD", 0.3, "risk nominal (defer to strategy AIs)");
    },
  },
];

class AiSociety {
  agents(): string[] {
    return AGENTS.map((a) => a.name);
  }

  private async view(symbol: string, exchange: "NSE" | "BSE"): Promise<MarketView> {
    const candles = await repository.getCandles(symbol, "1D", { limit: 250, exchange });
    const bars = historicalManager.toBars(candles);
    const quote = await providerManager.getQuote(symbol, exchange);
    bars.push({ ts: quote.ts, open: quote.open, high: quote.high, low: quote.low, close: quote.ltp, volume: quote.volume });
    return { symbol, exchange, bars, ltp: quote.ltp, prevClose: quote.prevClose };
  }

  /** Collect independent opinions from every agent for a symbol. */
  async opinions(symbol: string, exchange: "NSE" | "BSE" = "NSE"): Promise<AgentOpinion[]> {
    const v = await this.view(symbol, exchange);
    return AGENTS.map((a) => a.assess(v));
  }
}

export const aiSociety = singleton("brain.society", () => new AiSociety());
