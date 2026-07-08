import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { snapshotEngine, portfolioLedger, bootstrapPortfolio } from "@/modules/portfolio";

export const dynamic = "force-dynamic";

// Portfolio timeline: snapshot history + ledger statement.
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolio();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const [timeline, ledger] = await Promise.all([
      snapshotEngine.timeline(account.id, 200),
      portfolioLedger.statement(account.id, 200),
    ]);
    return okResponse({ timeline, ledger });
  } catch (err) {
    return toResponse(err);
  }
}
