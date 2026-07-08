import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { portfolioEngine, executionQuality, tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

// Paper Trading account overview: portfolio + execution quality + recent activity.
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const [portfolio, quality, orders, positions] = await Promise.all([
      portfolioEngine.snapshot(account.id),
      executionQuality.summary(account.id),
      tradingRepository.listOrders(account.id, 20),
      tradingRepository.positions(account.id, "OPEN"),
    ]);
    return okResponse({
      account: { id: account.id, kind: account.kind, startingBalance: account.startingBalance },
      portfolio,
      executionQuality: quality,
      recentOrders: orders,
      openPositions: positions.filter((p) => p.quantity !== 0),
    });
  } catch (err) {
    return toResponse(err);
  }
}
