// AI Arena — Feature Engineering. ML-ready dataset builder (AI Brain input).
import { type Timeframe } from "../constants";
import { repository } from "../core/repository";
import {
  adx,
  atr,
  bollinger,
  ema,
  macd,
  obv,
  rsi,
  sma,
  vwap,
  type Bar,
} from "../indicators/indicators";

export interface FeatureRow {
  ts: number;
  [feature: string]: number;
}

export interface Dataset {
  symbol: string;
  timeframe: Timeframe;
  features: string[];
  rows: FeatureRow[];
  meta: {
    normalization: "zscore" | "minmax" | "none";
    count: number;
    lags: number;
    rollingWindows: number[];
  };
}

class FeatureEngineering {
  private zscore(values: number[]): number[] {
    const valid = values.filter((v) => Number.isFinite(v));
    const mean = valid.reduce((a, b) => a + b, 0) / (valid.length || 1);
    const sd = Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / (valid.length || 1)) || 1;
    return values.map((v) => (Number.isFinite(v) ? +((v - mean) / sd).toFixed(6) : 0));
  }

  private minmax(values: number[]): number[] {
    const valid = values.filter((v) => Number.isFinite(v));
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    return values.map((v) => (Number.isFinite(v) ? +((v - min) / range).toFixed(6) : 0));
  }

  async build(
    symbol: string,
    timeframe: Timeframe,
    opts: {
      normalization?: "zscore" | "minmax" | "none";
      lags?: number;
      rollingWindows?: number[];
      limit?: number;
    } = {},
  ): Promise<Dataset> {
    const normalization = opts.normalization ?? "zscore";
    const lags = opts.lags ?? 3;
    const rollingWindows = opts.rollingWindows ?? [5, 10, 20];

    const candles = await repository.getCandles(symbol, timeframe, { limit: opts.limit ?? 1000 });
    const bars: Bar[] = candles.map((c) => ({
      ts: c.ts.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
    const closes = bars.map((b) => b.close);

    // Base derived features (reuse indicator library — no duplicate math).
    const columns: Record<string, number[]> = {
      close: closes,
      return1: closes.map((c, i) => (i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1])),
      logVolume: bars.map((b) => Math.log1p(b.volume)),
      rsi14: rsi(closes, 14),
      macdHist: macd(closes).histogram,
      atr14: atr(bars, 14),
      adx14: adx(bars, 14),
      obv: obv(bars),
      vwap: vwap(bars),
      emaSpread: closes.map((c, i) => {
        const e = ema(closes, 21)[i];
        return Number.isNaN(e) ? 0 : (c - e) / c;
      }),
      bbPos: (() => {
        const bb = bollinger(closes);
        return closes.map((c, i) => {
          const width = bb.upper[i] - bb.lower[i];
          return width > 0 ? (c - bb.lower[i]) / width : 0.5;
        });
      })(),
    };

    // Rolling window features.
    for (const w of rollingWindows) {
      columns[`smaRet${w}`] = sma(columns.return1, w);
    }

    // Lag features.
    for (let l = 1; l <= lags; l += 1) {
      columns[`closeLag${l}`] = closes.map((_, i) => (i - l >= 0 ? closes[i - l] : closes[0]));
      columns[`retLag${l}`] = columns.return1.map((_, i) =>
        i - l >= 0 ? columns.return1[i - l] : 0,
      );
    }

    // Normalization/scaling.
    const scaled: Record<string, number[]> = {};
    for (const [name, values] of Object.entries(columns)) {
      if (normalization === "zscore") scaled[name] = this.zscore(values);
      else if (normalization === "minmax") scaled[name] = this.minmax(values);
      else scaled[name] = values.map((v) => (Number.isFinite(v) ? v : 0));
    }

    const featureNames = Object.keys(scaled);
    const rows: FeatureRow[] = bars.map((b, i) => {
      const row: FeatureRow = { ts: b.ts };
      for (const name of featureNames) row[name] = scaled[name][i];
      return row;
    });

    return {
      symbol,
      timeframe,
      features: featureNames,
      rows,
      meta: { normalization, count: rows.length, lags, rollingWindows },
    };
  }
}

export const featureEngineering = new FeatureEngineering();
