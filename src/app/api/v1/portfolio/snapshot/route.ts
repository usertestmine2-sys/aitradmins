import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { snapshotEngine, bootstrapPortfolio } from "@/modules/portfolio";

export const dynamic = "force-dynamic";

// Capture a new immutable snapshot (append-only).
export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolio();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const snapshot = await snapshotEngine.capture(account.id);
    return okResponse({ snapshot }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
