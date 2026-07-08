// AI Arena — Production indicator library. Single source; no duplicate calculations.
// All indicators consume the shared Bar[] shape. Pure & deterministic.

export interface Bar {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const closes = (bars: Bar[]) => bars.map((b) => b.close);
const highs = (bars: Bar[]) => bars.map((b) => b.high);
const lows = (bars: Bar[]) => bars.map((b) => b.low);

// ---- Moving averages (foundation reused everywhere) ----
export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) {
      out.push(NaN);
      continue;
    }
    if (Number.isNaN(prev)) {
      const seed = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      prev = seed;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

// Wilder's smoothing (reused by RSI/ADX/ATR — avoids duplicate logic).
function wilder(values: number[], period: number): number[] {
  const out: number[] = [];
  let prev = NaN;
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) {
      out.push(NaN);
    } else if (Number.isNaN(prev)) {
      prev = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      out.push(prev);
    } else {
      prev = (prev * (period - 1) + values[i]) / period;
      out.push(prev);
    }
  }
  return out;
}

function trueRange(bars: Bar[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < bars.length; i += 1) {
    if (i === 0) {
      tr.push(bars[i].high - bars[i].low);
      continue;
    }
    const prevClose = bars[i - 1].close;
    tr.push(
      Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - prevClose),
        Math.abs(bars[i].low - prevClose),
      ),
    );
  }
  return tr;
}

export function atr(bars: Bar[], period = 14): number[] {
  return wilder(trueRange(bars), period);
}

export function rsi(values: number[], period = 14): number[] {
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgGain = wilder(gains, period);
  const avgLoss = wilder(losses, period);
  return avgGain.map((g, i) => {
    if (Number.isNaN(g) || Number.isNaN(avgLoss[i])) return NaN;
    if (avgLoss[i] === 0) return 100;
    const rs = g / avgLoss[i];
    return 100 - 100 / (1 + rs);
  });
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i],
  );
  const clean = macdLine.filter((v) => !Number.isNaN(v));
  const signalClean = ema(clean, signal);
  const signalLine: number[] = [];
  let j = 0;
  for (const v of macdLine) {
    signalLine.push(Number.isNaN(v) ? NaN : signalClean[j++]);
  }
  const histogram = macdLine.map((v, i) =>
    Number.isNaN(v) || Number.isNaN(signalLine[i]) ? NaN : v - signalLine[i],
  );
  return { macd: macdLine, signal: signalLine, histogram };
}

export function adx(bars: Bar[], period = 14): number[] {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < bars.length; i += 1) {
    const up = bars[i].high - bars[i - 1].high;
    const down = bars[i - 1].low - bars[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }
  const tr = wilder(trueRange(bars), period);
  const plus = wilder(plusDM, period);
  const minus = wilder(minusDM, period);
  const dx = bars.map((_, i) => {
    if (Number.isNaN(tr[i]) || tr[i] === 0) return NaN;
    const pdi = (plus[i] / tr[i]) * 100;
    const mdi = (minus[i] / tr[i]) * 100;
    const sum = pdi + mdi;
    return sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100;
  });
  const dxClean = dx.filter((v) => !Number.isNaN(v));
  const adxClean = wilder(dxClean, period);
  const out: number[] = [];
  let j = 0;
  for (const v of dx) out.push(Number.isNaN(v) ? NaN : adxClean[j++]);
  return out;
}

export function cci(bars: Bar[], period = 20): number[] {
  const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
  const tpSma = sma(tp, period);
  return tp.map((v, i) => {
    if (i < period - 1) return NaN;
    const window = tp.slice(i - period + 1, i + 1);
    const mean = tpSma[i];
    const md = window.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    return md === 0 ? 0 : (v - mean) / (0.015 * md);
  });
}

export function obv(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i += 1) {
    const prev = out[i - 1];
    if (bars[i].close > bars[i - 1].close) out.push(prev + bars[i].volume);
    else if (bars[i].close < bars[i - 1].close) out.push(prev - bars[i].volume);
    else out.push(prev);
  }
  return out;
}

export function vwap(bars: Bar[]): number[] {
  let cumPV = 0;
  let cumV = 0;
  return bars.map((b) => {
    const tp = (b.high + b.low + b.close) / 3;
    cumPV += tp * b.volume;
    cumV += b.volume;
    return cumV === 0 ? b.close : cumPV / cumV;
  });
}

export function bollinger(
  values: number[],
  period = 20,
  mult = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(values, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const window = values.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + mult * sd);
    lower.push(mean - mult * sd);
  }
  return { upper, middle, lower };
}

export function donchian(
  bars: Bar[],
  period = 20,
): { upper: number[]; middle: number[]; lower: number[] } {
  const h = highs(bars);
  const l = lows(bars);
  const upper: number[] = [];
  const lower: number[] = [];
  const middle: number[] = [];
  for (let i = 0; i < bars.length; i += 1) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      middle.push(NaN);
      continue;
    }
    const hi = Math.max(...h.slice(i - period + 1, i + 1));
    const lo = Math.min(...l.slice(i - period + 1, i + 1));
    upper.push(hi);
    lower.push(lo);
    middle.push((hi + lo) / 2);
  }
  return { upper, middle, lower };
}

export function keltner(
  bars: Bar[],
  period = 20,
  mult = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = ema(closes(bars), period);
  const range = atr(bars, period);
  const upper = middle.map((m, i) => (Number.isNaN(m) ? NaN : m + mult * range[i]));
  const lower = middle.map((m, i) => (Number.isNaN(m) ? NaN : m - mult * range[i]));
  return { upper, middle, lower };
}

export function supertrend(
  bars: Bar[],
  period = 10,
  mult = 3,
): { value: number[]; direction: number[] } {
  const range = atr(bars, period);
  const value: number[] = [];
  const direction: number[] = [];
  let prevUpper = NaN;
  let prevLower = NaN;
  let prevTrend = 1;
  for (let i = 0; i < bars.length; i += 1) {
    const mid = (bars[i].high + bars[i].low) / 2;
    if (Number.isNaN(range[i])) {
      value.push(NaN);
      direction.push(0);
      continue;
    }
    const basicUpper = mid + mult * range[i];
    const basicLower = mid - mult * range[i];
    const upper =
      Number.isNaN(prevUpper) || bars[i - 1]?.close > prevUpper
        ? basicUpper
        : Math.min(basicUpper, prevUpper);
    const lower =
      Number.isNaN(prevLower) || bars[i - 1]?.close < prevLower
        ? basicLower
        : Math.max(basicLower, prevLower);
    let trend = prevTrend;
    if (bars[i].close > (Number.isNaN(prevUpper) ? basicUpper : prevUpper)) trend = 1;
    else if (bars[i].close < (Number.isNaN(prevLower) ? basicLower : prevLower)) trend = -1;
    value.push(trend === 1 ? lower : upper);
    direction.push(trend);
    prevUpper = upper;
    prevLower = lower;
    prevTrend = trend;
  }
  return { value, direction };
}

export function ichimoku(
  bars: Bar[],
  conversion = 9,
  base = 26,
  spanB = 52,
): {
  conversion: number[];
  base: number[];
  spanA: number[];
  spanB: number[];
} {
  const midpoint = (start: number, i: number) => {
    if (i < start - 1) return NaN;
    const hi = Math.max(...highs(bars).slice(i - start + 1, i + 1));
    const lo = Math.min(...lows(bars).slice(i - start + 1, i + 1));
    return (hi + lo) / 2;
  };
  const conv = bars.map((_, i) => midpoint(conversion, i));
  const baseLine = bars.map((_, i) => midpoint(base, i));
  const spanA = bars.map((_, i) =>
    Number.isNaN(conv[i]) || Number.isNaN(baseLine[i]) ? NaN : (conv[i] + baseLine[i]) / 2,
  );
  const spanBLine = bars.map((_, i) => midpoint(spanB, i));
  return { conversion: conv, base: baseLine, spanA, spanB: spanBLine };
}

// Volume Profile — distribution of volume across price bins.
export function volumeProfile(
  bars: Bar[],
  bins = 24,
): { price: number; volume: number }[] {
  if (bars.length === 0) return [];
  const hi = Math.max(...highs(bars));
  const lo = Math.min(...lows(bars));
  const step = (hi - lo) / bins || 1;
  const profile = Array.from({ length: bins }, (_, i) => ({
    price: lo + step * (i + 0.5),
    volume: 0,
  }));
  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((tp - lo) / step)));
    profile[idx].volume += b.volume;
  }
  return profile;
}

// Market Profile — TPO letter counts per price bin (session structure).
export function marketProfile(
  bars: Bar[],
  bins = 24,
): { price: number; tpo: number; poc: boolean }[] {
  const vp = volumeProfile(bars, bins);
  const counts = vp.map((row, i) => {
    const touches = bars.filter((b) => {
      const lo = row.price - (vp[1]?.price ?? row.price - 1 - row.price) / 2;
      return b.low <= row.price && b.high >= row.price && i >= 0 && b.close >= lo - 1;
    }).length;
    return { price: row.price, tpo: touches };
  });
  const maxTpo = Math.max(...counts.map((c) => c.tpo), 0);
  return counts.map((c) => ({ ...c, poc: c.tpo === maxTpo && maxTpo > 0 }));
}

export function last(values: number[]): number {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (!Number.isNaN(values[i])) return values[i];
  }
  return NaN;
}
