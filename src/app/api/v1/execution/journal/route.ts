import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";
import { executionJournalService, bootstrapExecution } from "@/modules/execution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapExecution();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    if (orderId) {
      return okResponse({ journal: await executionJournalService.forOrder(Number(orderId)) });
    }
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    return okResponse({ journal: await executionJournalService.forAccount(account.id, 300) });
  } catch (err) {
    return toResponse(err);
  }
}
