import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { riskBudgetEngine, bootstrapPortfolioIntel } from "@/modules/portfolio_intel";
import { tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

// Portfolio risk-budget view (VaR/CVaR/beta/vol/concentration/sector risk).
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolioIntel();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const riskBudget = await riskBudgetEngine.compute(account.id);
    return okResponse({ riskBudget });
  } catch (err) {
    return toResponse(err);
  }
}
