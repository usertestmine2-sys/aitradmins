import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { providerManager } from "@/modules/market_data";
import { symbolMaster } from "@/modules/market_data/services/symbol-master";
import { tradingRepository, portfolioEngine } from "@/modules/trading";

export const dynamic = "force-dynamic";

// Holdings view: market value, book value, weight, unrealized PnL per symbol.
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const snapshot = await portfolioEngine.snapshot(account.id);
    const positions = (await tradingRepository.positions(account.id, "OPEN")).filter((p) => p.quantity !== 0);

    const holdings = [];
    for (const p of positions) {
      const quote = await providerManager.getQuote(p.symbol, p.exchange as "NSE" | "BSE");
      const marketValue = Math.abs(p.quantity) * quote.ltp;
      const bookValue = Math.abs(p.quantity) * p.avgPrice;
      const direction = p.quantity > 0 ? 1 : -1;
      const sym = await symbolMaster.get(p.symbol, p.exchange);
      holdings.push({
        symbol: p.symbol,
        side: p.quantity > 0 ? "LONG" : "SHORT",
        quantity: p.quantity,
        avgPrice: p.avgPrice,
        ltp: quote.ltp,
        marketValue: +marketValue.toFixed(2),
        bookValue: +bookValue.toFixed(2),
        unrealizedPnl: +(direction * (quote.ltp - p.avgPrice) * Math.abs(p.quantity)).toFixed(2),
        weight: snapshot.equity > 0 ? +((marketValue / snapshot.equity) * 100).toFixed(2) : 0,
        sector: sym?.sector ?? "Unknown",
      });
    }
    return okResponse({ holdings, equity: snapshot.equity });
  } catch (err) {
    return toResponse(err);
  }
}
