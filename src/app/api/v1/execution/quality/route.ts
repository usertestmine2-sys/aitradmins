import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { qualityTracker, bootstrapExecution } from "@/modules/execution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapExecution();
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    return okResponse({ quality: await qualityTracker.history(account.id, 200) });
  } catch (err) {
    return toResponse(err);
  }
}
