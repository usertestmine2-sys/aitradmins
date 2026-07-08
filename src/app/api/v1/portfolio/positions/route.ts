import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

// Full position book: open + closed with realized PnL.
export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const [open, closed] = await Promise.all([
      tradingRepository.positions(account.id, "OPEN"),
      tradingRepository.positions(account.id, "CLOSED"),
    ]);
    return okResponse({
      open: open.filter((p) => p.quantity !== 0),
      closed,
    });
  } catch (err) {
    return toResponse(err);
  }
}
