import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { performanceEngine, bootstrapPortfolio } from "@/modules/portfolio";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolio();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    return okResponse({ performance: await performanceEngine.report(account.id) });
  } catch (err) {
    return toResponse(err);
  }
}
