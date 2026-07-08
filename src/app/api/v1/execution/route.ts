import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { executionQuality, tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const quality = await executionQuality.summary(account.id);
    const fills = await tradingRepository.fills(account.id, 50);
    return okResponse({ quality, recentFills: fills });
  } catch (err) {
    return toResponse(err);
  }
}
