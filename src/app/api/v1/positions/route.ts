import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const positions = await tradingRepository.positions(account.id, status ?? undefined);
    return okResponse({ positions });
  } catch (err) {
    return toResponse(err);
  }
}
