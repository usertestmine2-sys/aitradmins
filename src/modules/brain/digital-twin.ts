// AITradeMinds — Digital Twin. Replays historical reality and simulates
// alternative entries/exits/holding/position-size to surface missed opportunity
// and avoided loss. Writes ONLY to Research memory (never live learning).
import { singleton } from "@/kernel";
import { repository } from "@/modules/market_data/core/repository";
import { historicalManager } from "@/modules/market_data/services/historical";
import type { Timeframe } from "@/modules/market_data/constants";
import { brainRepository } from "./repository";

export interface TwinScenario {
  label: string;
  entryTs: string;
  exitTs: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  holdingBars: number;
}

export interface TwinResult {
  symbol: string;
  actual: TwinScenario;
  alternatives: TwinScenario[];
  bestAlternative: TwinScenario | null;
  missedOpportunity: number; // best alt return - actual return
  avoidedLoss: number; // how much worse the worst alt would have been
}

class DigitalTwin {
  /**
   * Given an actual entry index + holding, simulate alternatives around it.
   * Pure historical replay; results stored in RESEARCH memory only.
   */
  async simulate(
    symbol: string,
    timeframe: Timeframe,
    opts: { entryOffset?: number; holding?: number } = {},
  ): Promise<TwinResult> {
    const candles = await repository.getCandles(symbol, timeframe, { limit: 400 });
    const bars = historicalManager.toBars(candles);
    if (bars.length < 40) {
      throw new Error(`Insufficient history for digital twin on ${symbol}`);
    }

    const entryIdx = Math.min(
      bars.length - 20,
      Math.max(10, opts.entryOffset ?? Math.floor(bars.length / 2)),
    );
    const holding = opts.holding ?? 5;

    const scenario = (label: string, ei: number, h: number): TwinScenario => {
      const xi = Math.min(bars.length - 1, ei + h);
      const entryPrice = bars[ei].close;
      const exitPrice = bars[xi].close;
      return {
        label,
        entryTs: new Date(bars[ei].ts).toISOString(),
        exitTs: new Date(bars[xi].ts).toISOString(),
        entryPrice: +entryPrice.toFixed(2),
        exitPrice: +exitPrice.toFixed(2),
        returnPct: +(((exitPrice - entryPrice) / entryPrice) * 100).toFixed(3),
        holdingBars: xi - ei,
      };
    };

    const actual = scenario("ACTUAL", entryIdx, holding);
    const alternatives: TwinScenario[] = [
      scenario("EARLIER_ENTRY", Math.max(0, entryIdx - 3), holding),
      scenario("LATER_ENTRY", entryIdx + 3, holding),
      scenario("SHORTER_HOLD", entryIdx, Math.max(1, holding - 3)),
      scenario("LONGER_HOLD", entryIdx, holding + 5),
    ];

    const byReturn = [...alternatives].sort((a, b) => b.returnPct - a.returnPct);
    const bestAlternative = byReturn[0] ?? null;
    const worstAlternative = byReturn[byReturn.length - 1] ?? null;
    const missedOpportunity = bestAlternative
      ? +(bestAlternative.returnPct - actual.returnPct).toFixed(3)
      : 0;
    const avoidedLoss = worstAlternative
      ? +(actual.returnPct - worstAlternative.returnPct).toFixed(3)
      : 0;

    const result: TwinResult = {
      symbol,
      actual,
      alternatives,
      bestAlternative,
      missedOpportunity,
      avoidedLoss,
    };

    // Research memory only — never touches live learning.
    await brainRepository.remember({
      tier: "RESEARCH",
      kind: "RESEARCH",
      subject: `twin:${symbol}`,
      content: { actual: actual.returnPct, missedOpportunity, avoidedLoss },
      importance: 0.3,
    });

    return result;
  }
}

export const digitalTwin = singleton("brain.digitalTwin", () => new DigitalTwin());
