import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository, DEFAULT_LIMITS } from "@/modules/trading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const decisions = await tradingRepository.riskDecisions(account.id, 100);
    const rejected = decisions.filter((d) => d.decision === "REJECTED").length;
    return okResponse({
      limits: DEFAULT_LIMITS,
      decisions,
      summary: { total: decisions.length, rejected, approved: decisions.length - rejected },
    });
  } catch (err) {
    return toResponse(err);
  }
}
