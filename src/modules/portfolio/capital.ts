// AITradeMinds — Capital Manager. Breaks account cash into available/reserved/
// blocked/margin/buying-power. Reuses tradingRepository + portfolioEngine.
import { singleton } from "@/kernel";
import { portfolioEngine, tradingRepository } from "@/modules/trading";

export interface CapitalBreakdown {
  startingBalance: number;
  cash: number;
  investedValue: number;
  equity: number;
  reservedCapital: number; // emergency reserve (5%)
  blockedCapital: number; // notional of open positions
  marginCapital: number; // n/a for PAPER cash product (0)
  buyingPower: number;
  capitalUtilizationPct: number;
  leverage: number;
}

const RESERVE_PCT = 0.05;

class CapitalManager {
  async breakdown(accountId: number): Promise<CapitalBreakdown> {
    const account = await tradingRepository.getAccount(accountId);
    const state = await portfolioEngine.snapshot(accountId);
    const startingBalance = account?.startingBalance ?? 0;
    const reserved = +(startingBalance * RESERVE_PCT).toFixed(2);
    const blocked = state.investedValue;
    const buyingPower = Math.max(0, +(state.cash - reserved).toFixed(2));
    const utilization = startingBalance > 0 ? +((blocked / startingBalance) * 100).toFixed(2) : 0;
    const leverage = state.equity > 0 ? +(blocked / state.equity).toFixed(4) : 0;

    return {
      startingBalance: +startingBalance.toFixed(2),
      cash: state.cash,
      investedValue: state.investedValue,
      equity: state.equity,
      reservedCapital: reserved,
      blockedCapital: blocked,
      marginCapital: 0,
      buyingPower,
      capitalUtilizationPct: utilization,
      leverage,
    };
  }
}

export const capitalManager = singleton("portfolio.capital", () => new CapitalManager());
