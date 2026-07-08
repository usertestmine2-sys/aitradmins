// AI Arena — Corporate Action Engine. Applies automatic historical adjustment.
import { CACHE_NS, type CorporateActionType, type Timeframe, TIMEFRAMES } from "../constants";
import { cache } from "../core/cache";
import { eventBus } from "../core/event-bus";
import { repository } from "../core/repository";
import { symbolMaster } from "./symbol-master";
import type { MdCorporateAction } from "@/db/schema";

interface RegisterInput {
  symbol: string;
  exchange?: string;
  actionType: CorporateActionType;
  exDate: string;
  recordDate?: string;
  ratioFrom?: number;
  ratioTo?: number;
  value?: number;
  details?: string;
}

class CorporateActionEngine {
  async register(input: RegisterInput): Promise<MdCorporateAction> {
    return repository.insertCorporateAction({
      symbol: input.symbol,
      exchange: input.exchange ?? "NSE",
      actionType: input.actionType,
      exDate: input.exDate,
      recordDate: input.recordDate,
      ratioFrom: input.ratioFrom,
      ratioTo: input.ratioTo,
      value: input.value,
      details: input.details,
    });
  }

  async list(symbol: string): Promise<MdCorporateAction[]> {
    return repository.corporateActionsFor(symbol);
  }

  // Compute the price/volume adjustment factor for a given action.
  private adjustmentFactor(a: MdCorporateAction): { price: number; volume: number } {
    switch (a.actionType) {
      case "SPLIT":
      case "BONUS":
      case "FACE_VALUE": {
        // e.g. 1:5 split -> factor 5. ratioTo new shares per ratioFrom old.
        const from = a.ratioFrom ?? 1;
        const to = a.ratioTo ?? 1;
        const factor = to > 0 && from > 0 ? (from + to) / from : 1;
        if (a.actionType === "SPLIT" || a.actionType === "FACE_VALUE") {
          const f = from / (to || 1);
          return { price: f, volume: 1 / f };
        }
        return { price: 1 / factor, volume: factor };
      }
      case "DIVIDEND": {
        // Approximate: subtract dividend from historical prices proportionally.
        return { price: 1, volume: 1 };
      }
      case "RIGHTS": {
        const from = a.ratioFrom ?? 1;
        const to = a.ratioTo ?? 1;
        const factor = from > 0 ? from / (from + to) : 1;
        return { price: factor, volume: 1 / factor };
      }
      default:
        return { price: 1, volume: 1 };
    }
  }

  // Apply automatic historical adjustment to all candles before the ex-date.
  async applyHistoricalAdjustment(action: MdCorporateAction): Promise<number> {
    const exTs = new Date(action.exDate);
    const factor = this.adjustmentFactor(action);
    const dividend = action.actionType === "DIVIDEND" ? action.value ?? 0 : 0;
    let adjusted = 0;

    for (const tf of TIMEFRAMES as readonly Timeframe[]) {
      const candles = await repository.getCandles(action.symbol, tf, {
        exchange: action.exchange,
        to: exTs,
        limit: 20000,
      });
      if (candles.length === 0) continue;
      const rows = candles.map((c) => ({
        symbol: c.symbol,
        exchange: c.exchange,
        timeframe: tf,
        ts: c.ts,
        open: +(c.open * factor.price - dividend).toFixed(4),
        high: +(c.high * factor.price - dividend).toFixed(4),
        low: +(c.low * factor.price - dividend).toFixed(4),
        close: +(c.close * factor.price - dividend).toFixed(4),
        volume: Math.round(c.volume * factor.volume),
        oi: c.oi,
        adjusted: true,
      }));
      adjusted += await repository.upsertCandles(rows);
    }

    // Update symbol metadata for structural actions.
    if (action.actionType === "FACE_VALUE" && action.value) {
      await symbolMaster.applyMetadataChange(action.symbol, { faceValue: action.value });
    }
    if (action.actionType === "DELISTING") {
      await symbolMaster.applyMetadataChange(action.symbol, { status: "DELISTED" });
    }
    if (action.actionType === "RELISTING") {
      await symbolMaster.applyMetadataChange(action.symbol, { status: "RELISTED" });
    }

    await repository.markCorporateActionApplied(action.id);
    cache.invalidate(CACHE_NS.candles, `${action.symbol}`);
    eventBus.publish("corporateAction", {
      symbol: action.symbol,
      actionType: action.actionType,
      ts: Date.now(),
    });
    return adjusted;
  }

  // Process every pending (unapplied) action — safe to run on a schedule.
  async processPending(): Promise<{ processed: number; adjustedCandles: number }> {
    const pending = await repository.pendingCorporateActions();
    let adjustedCandles = 0;
    const today = new Date();
    for (const action of pending) {
      if (new Date(action.exDate) <= today) {
        adjustedCandles += await this.applyHistoricalAdjustment(action);
      }
    }
    return { processed: pending.length, adjustedCandles };
  }
}

export const corporateActionEngine = new CorporateActionEngine();
