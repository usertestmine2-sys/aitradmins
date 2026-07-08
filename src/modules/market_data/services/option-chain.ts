// AI Arena — Option Chain Engine. OI, PCR, Greeks, IV, Max Pain, ranking.
import { CACHE_NS, CACHE_TTL } from "../constants";
import { cache } from "../core/cache";
import { repository } from "../core/repository";
import { providerManager } from "../providers/provider-manager";

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionLeg {
  strike: number;
  moneyness: "ITM" | "ATM" | "OTM";
  ltp: number;
  oi: number;
  volume: number;
  iv: number;
  greeks: Greeks;
}

export interface OptionChainRow {
  strike: number;
  call: OptionLeg;
  put: OptionLeg;
}

export interface OptionChain {
  underlying: string;
  expiry: string;
  spot: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  totalCallOi: number;
  totalPutOi: number;
  rows: OptionChainRow[];
  ts: number;
}

const norm = (x: number) => {
  // Abramowitz-Stegun CDF approximation for standard normal.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
};
const pdf = (x: number) => 0.3989423 * Math.exp((-x * x) / 2);

class OptionChainEngine {
  private blackScholes(
    spot: number,
    strike: number,
    t: number,
    iv: number,
    isCall: boolean,
    r = 0.065,
  ): { price: number; greeks: Greeks } {
    const vol = Math.max(iv, 0.0001);
    const time = Math.max(t, 1 / 365);
    const d1 =
      (Math.log(spot / strike) + (r + (vol * vol) / 2) * time) / (vol * Math.sqrt(time));
    const d2 = d1 - vol * Math.sqrt(time);
    const nd1 = norm(d1);
    const nd2 = norm(d2);
    const disc = Math.exp(-r * time);
    const price = isCall
      ? spot * nd1 - strike * disc * nd2
      : strike * disc * norm(-d2) - spot * norm(-d1);
    const delta = isCall ? nd1 : nd1 - 1;
    const gamma = pdf(d1) / (spot * vol * Math.sqrt(time));
    const theta =
      (-(spot * pdf(d1) * vol) / (2 * Math.sqrt(time)) -
        (isCall ? 1 : -1) * r * strike * disc * (isCall ? nd2 : norm(-d2))) /
      365;
    const vega = (spot * pdf(d1) * Math.sqrt(time)) / 100;
    const rho = ((isCall ? 1 : -1) * strike * time * disc * (isCall ? nd2 : norm(-d2))) / 100;
    return {
      price: Math.max(price, 0),
      greeks: {
        delta: +delta.toFixed(4),
        gamma: +gamma.toFixed(6),
        theta: +theta.toFixed(4),
        vega: +vega.toFixed(4),
        rho: +rho.toFixed(4),
      },
    };
  }

  private moneyness(strike: number, atm: number, isCall: boolean): "ITM" | "ATM" | "OTM" {
    if (strike === atm) return "ATM";
    if (isCall) return strike < atm ? "ITM" : "OTM";
    return strike > atm ? "ITM" : "OTM";
  }

  async build(
    underlying: string,
    expiry: string,
    depth = 10,
    step = underlying === "BANKNIFTY" ? 100 : 50,
  ): Promise<OptionChain> {
    const cacheId = `${underlying}:${expiry}`;
    return cache.getOrSet(CACHE_NS.optionChain, cacheId, CACHE_TTL.optionChain, async () => {
      const quote = await providerManager.getQuote(underlying, "NSE");
      const spot = quote.ltp;
      const atm = Math.round(spot / step) * step;
      const daysToExpiry = Math.max(1, (new Date(expiry).getTime() - Date.now()) / 86_400_000);
      const t = daysToExpiry / 365;

      const rows: OptionChainRow[] = [];
      let totalCallOi = 0;
      let totalPutOi = 0;

      for (let i = -depth; i <= depth; i += 1) {
        const strike = atm + i * step;
        if (strike <= 0) continue;
        const distance = Math.abs(strike - spot) / spot;
        const iv = 0.12 + distance * 0.9; // volatility smile
        const oiSeed = Math.max(0, 1 - distance * 4);
        const callOi = Math.floor(oiSeed * 1_500_000 + (i < 0 ? 300_000 : 0));
        const putOi = Math.floor(oiSeed * 1_500_000 + (i > 0 ? 300_000 : 0));
        totalCallOi += callOi;
        totalPutOi += putOi;

        const call = this.blackScholes(spot, strike, t, iv, true);
        const put = this.blackScholes(spot, strike, t, iv, false);

        rows.push({
          strike,
          call: {
            strike,
            moneyness: this.moneyness(strike, atm, true),
            ltp: +call.price.toFixed(2),
            oi: callOi,
            volume: Math.floor(callOi * 0.4),
            iv: +(iv * 100).toFixed(2),
            greeks: call.greeks,
          },
          put: {
            strike,
            moneyness: this.moneyness(strike, atm, false),
            ltp: +put.price.toFixed(2),
            oi: putOi,
            volume: Math.floor(putOi * 0.4),
            iv: +(iv * 100).toFixed(2),
            greeks: put.greeks,
          },
        });
      }

      const pcr = totalCallOi === 0 ? 0 : +(totalPutOi / totalCallOi).toFixed(3);
      const maxPain = this.maxPain(rows);

      const chain: OptionChain = {
        underlying,
        expiry,
        spot,
        atmStrike: atm,
        pcr,
        maxPain,
        totalCallOi,
        totalPutOi,
        rows,
        ts: Date.now(),
      };

      await repository.saveOptionSnapshot({
        underlying,
        expiry,
        spot,
        pcr,
        maxPain,
        totalCallOi,
        totalPutOi,
        chain,
      });
      return chain;
    });
  }

  // Max Pain = strike where total option writer payoff is minimized.
  private maxPain(rows: OptionChainRow[]): number {
    let best = rows[0]?.strike ?? 0;
    let min = Infinity;
    for (const candidate of rows) {
      let pain = 0;
      for (const r of rows) {
        if (candidate.strike > r.strike) pain += (candidate.strike - r.strike) * r.call.oi;
        if (candidate.strike < r.strike) pain += (r.strike - candidate.strike) * r.put.oi;
      }
      if (pain < min) {
        min = pain;
        best = candidate.strike;
      }
    }
    return best;
  }

  // Strike Ranking by combined OI + volume liquidity.
  rankStrikes(chain: OptionChain, top = 5) {
    return [...chain.rows]
      .map((r) => ({
        strike: r.strike,
        score: r.call.oi + r.put.oi + r.call.volume + r.put.volume,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, top);
  }
}

export const optionChainEngine = new OptionChainEngine();
