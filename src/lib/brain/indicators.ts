import type { IndicatorSnapshot, PatternResult } from "@/lib/brain/types";

/**
 * Indicator Engine — pure deterministic computation over OHLCV series.
 * Series are ordered oldest → newest. No side effects, no I/O.
 */

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    value = values[i] * k + value * (1 - k);
  }
  return value;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function atr(bars: Bar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = bars.length - period; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    trs.push(
      Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - prevClose),
        Math.abs(bars[i].low - prevClose),
      ),
    );
  }
  return trs.reduce((a, b) => a + b, 0) / period;
}

export function rateOfChange(closes: number[], period = 10): number | null {
  if (closes.length < period + 1) return null;
  const past = closes[closes.length - 1 - period];
  if (past === 0) return null;
  return ((closes[closes.length - 1] - past) / past) * 100;
}

/** Annualization-free daily return volatility in percent (last `period` returns). */
export function volatilityPct(closes: number[], period = 20): number | null {
  if (closes.length < period + 1) return null;
  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

export function computeIndicators(bars: Bar[]): IndicatorSnapshot {
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const last20 = bars.slice(-20);
  return {
    close: closes[closes.length - 1] ?? 0,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    rsi14: rsi(closes, 14),
    atr14: atr(bars, 14),
    roc10: rateOfChange(closes, 10),
    volatilityPct: volatilityPct(closes, 20),
    avgVolume20: sma(volumes, 20),
    lastVolume: volumes[volumes.length - 1] ?? 0,
    high20: last20.length === 20 ? Math.max(...last20.map((b) => b.high)) : null,
    low20: last20.length === 20 ? Math.min(...last20.map((b) => b.low)) : null,
  };
}

/**
 * Pattern Detection Engine — deterministic structural patterns computed from
 * the bar series and the indicator snapshot.
 */
export function detectPatterns(bars: Bar[], ind: IndicatorSnapshot): PatternResult[] {
  const patterns: PatternResult[] = [];
  if (bars.length < 21) return patterns;

  const close = ind.close;
  const prevBars = bars.slice(0, -1);
  const prevHigh20 = Math.max(...prevBars.slice(-20).map((b) => b.high));
  const prevLow20 = Math.min(...prevBars.slice(-20).map((b) => b.low));

  // 20-day breakout with volume confirmation
  if (close > prevHigh20) {
    const volumeConfirmed =
      ind.avgVolume20 != null && ind.avgVolume20 > 0 && ind.lastVolume > ind.avgVolume20 * 1.2;
    patterns.push({
      name: "breakout-20d-high",
      direction: 1,
      strength: volumeConfirmed ? 0.9 : 0.6,
      evidence: `Close ${close.toFixed(2)} above prior 20d high ${prevHigh20.toFixed(2)}${
        volumeConfirmed ? " on +20% volume" : ""
      }`,
    });
  }

  // 20-day breakdown
  if (close < prevLow20) {
    patterns.push({
      name: "breakdown-20d-low",
      direction: -1,
      strength: 0.7,
      evidence: `Close ${close.toFixed(2)} below prior 20d low ${prevLow20.toFixed(2)}`,
    });
  }

  // EMA20/EMA50 alignment (trend structure)
  if (ind.ema20 != null && ind.ema50 != null) {
    if (ind.ema20 > ind.ema50 && close > ind.ema20) {
      patterns.push({
        name: "trend-alignment-bullish",
        direction: 1,
        strength: 0.5,
        evidence: `Price > EMA20 (${ind.ema20.toFixed(2)}) > EMA50 (${ind.ema50.toFixed(2)})`,
      });
    } else if (ind.ema20 < ind.ema50 && close < ind.ema20) {
      patterns.push({
        name: "trend-alignment-bearish",
        direction: -1,
        strength: 0.5,
        evidence: `Price < EMA20 (${ind.ema20.toFixed(2)}) < EMA50 (${ind.ema50.toFixed(2)})`,
      });
    }
  }

  // RSI exhaustion zones (mean-reversion setups)
  if (ind.rsi14 != null) {
    if (ind.rsi14 <= 30) {
      patterns.push({
        name: "oversold-rsi",
        direction: 1,
        strength: Math.min(1, (30 - ind.rsi14) / 15 + 0.4),
        evidence: `RSI14 ${ind.rsi14.toFixed(1)} in oversold zone`,
      });
    } else if (ind.rsi14 >= 70) {
      patterns.push({
        name: "overbought-rsi",
        direction: -1,
        strength: Math.min(1, (ind.rsi14 - 70) / 15 + 0.4),
        evidence: `RSI14 ${ind.rsi14.toFixed(1)} in overbought zone`,
      });
    }
  }

  return patterns;
}
