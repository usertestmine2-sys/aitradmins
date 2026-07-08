import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { portfolioEngine, tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const snapshot = await portfolioEngine.snapshot(account.id);
    return okResponse({ account: { id: account.id, kind: account.kind }, portfolio: snapshot });
  } catch (err) {
    return toResponse(err);
  }
}
