// AITradeMinds — Execution Quality analytics. Derives fill quality from real fills.
import { singleton } from "@/kernel";
import { tradingRepository } from "./repository";

export interface ExecutionQuality {
  fills: number;
  avgSlippage: number;
  avgSpread: number;
  avgLatencyMs: number;
  fillRatio: number;
  priceImprovement: number; // fills better than expected (%)
}

class ExecutionQualityService {
  async summary(accountId: number): Promise<ExecutionQuality> {
    const fills = await tradingRepository.fills(accountId, 500);
    if (fills.length === 0) {
      return { fills: 0, avgSlippage: 0, avgSpread: 0, avgLatencyMs: 0, fillRatio: 0, priceImprovement: 0 };
    }
    const orders = await tradingRepository.listOrders(accountId, 500);
    const totalReq = orders.reduce((a, o) => a + o.quantity, 0);
    const totalFilled = orders.reduce((a, o) => a + o.filledQuantity, 0);
    const improved = fills.filter((f) =>
      f.side === "BUY" ? f.price < f.expectedPrice : f.price > f.expectedPrice,
    ).length;

    return {
      fills: fills.length,
      avgSlippage: +(fills.reduce((a, f) => a + Math.abs(f.slippage), 0) / fills.length).toFixed(4),
      avgSpread: +(fills.reduce((a, f) => a + f.spread, 0) / fills.length).toFixed(4),
      avgLatencyMs: Math.round(fills.reduce((a, f) => a + f.latencyMs, 0) / fills.length),
      fillRatio: totalReq > 0 ? +(totalFilled / totalReq).toFixed(4) : 0,
      priceImprovement: +((improved / fills.length) * 100).toFixed(2),
    };
  }
}

export const executionQuality = singleton("trading.executionQuality", () => new ExecutionQualityService());
