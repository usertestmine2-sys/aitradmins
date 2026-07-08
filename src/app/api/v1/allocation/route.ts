import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { portfolioIntelligence, bootstrapPortfolioIntel } from "@/modules/portfolio_intel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolioIntel();
    return okResponse(await portfolioIntelligence.history(ctx.userId));
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(50),
  optimizer: z.enum(["EQUAL_WEIGHT", "MIN_VARIANCE", "MAX_SHARPE", "RISK_PARITY", "MEAN_VARIANCE"]).optional(),
  sizing: z.enum(["FRACTIONAL_KELLY", "ATR", "VOLATILITY", "FIXED_RISK", "RISK_PARITY"]).optional(),
  regime: z.string().optional(),
  maxAllocationPct: z.number().positive().max(100).optional(),
  riskPerTradePct: z.number().positive().max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPortfolioIntel();
    const body = await parseBody(req, schema);
    const plan = await portfolioIntelligence.plan(ctx.userId, body.symbols, {
      optimizer: body.optimizer,
      sizing: body.sizing,
      regime: body.regime,
      maxAllocationPct: body.maxAllocationPct,
      riskPerTradePct: body.riskPerTradePct,
    });
    return okResponse(plan, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
