import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { qualityTracker, bootstrapExecution } from "@/modules/execution";

export const dynamic = "force-dynamic";

// Execution history: orders + per-trade quality (parallel reads, no N+1).
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapExecution();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const [orders, quality] = await Promise.all([
      tradingRepository.listOrders(account.id, 100),
      qualityTracker.history(account.id, 200),
    ]);
    return okResponse({ orders, quality });
  } catch (err) {
    return toResponse(err);
  }
}
