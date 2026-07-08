import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { portfolioIntelligence, bootstrapPortfolioIntel } from "@/modules/portfolio_intel";

export const dynamic = "force-dynamic";

const schema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(50),
  optimizer: z.enum(["EQUAL_WEIGHT", "MIN_VARIANCE", "MAX_SHARPE", "RISK_PARITY", "MEAN_VARIANCE"]).optional(),
});

// Rebalance recommendations ONLY — never auto-executes.
export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolioIntel();
    const body = await parseBody(req, schema);
    const result = await portfolioIntelligence.rebalance(ctx.userId, body.symbols, body.optimizer);
    return okResponse({ ...result, note: "RECOMMENDED only — not executed" }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
