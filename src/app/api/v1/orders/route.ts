import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { MODEL_KEYS } from "@/modules/training";
import { oms, tradingRepository } from "@/modules/trading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const account = await tradingRepository.ensureAccount(ctx.userId, "PAPER");
    const orders = await tradingRepository.listOrders(account.id, 100);
    return okResponse({ orders });
  } catch (err) {
    return toResponse(err);
  }
}

const placeSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(["NSE", "BSE"]).optional(),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "SL", "SL_M"]).optional(),
  product: z.enum(["INTRADAY", "DELIVERY", "FUT", "OPT"]).optional(),
  quantity: z.number().int().positive(),
  limitPrice: z.number().positive().optional(),
  triggerPrice: z.number().positive().optional(),
  strategy: z.string().optional(),
  modelKey: z.enum(MODEL_KEYS).optional(),
  confidence: z.number().min(0).max(1).optional(),
  regime: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const body = await parseBody(req, placeSchema);
    const result = await oms.place({ userId: ctx.userId, ...body });
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

const cancelSchema = z.object({ action: z.literal("cancel"), orderId: z.number().int().positive() });

export async function PATCH(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const body = await parseBody(req, cancelSchema);
    if (body.action !== "cancel") throw errors.badRequest("unsupported action");
    return okResponse(await oms.cancel(ctx.userId, body.orderId));
  } catch (err) {
    return toResponse(err);
  }
}
