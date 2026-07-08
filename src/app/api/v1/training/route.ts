import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAdmin } from "@/modules/identity";
import { bootstrapMarketData } from "@/modules/market_data";
import { bootstrapTraining, trainingManager, MODEL_KEYS } from "@/modules/training";
import type { ModelKey } from "@/modules/training";
import type { Timeframe } from "@/modules/market_data/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  modelKey: z.enum(MODEL_KEYS),
  symbol: z.string().min(1),
  timeframe: z.string().default("1D"),
  horizon: z.number().int().positive().max(50).optional(),
  limit: z.number().int().positive().max(5000).optional(),
  activate: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapTraining();
    await bootstrapMarketData();
    const body = await parseBody(req, schema);
    const result = await trainingManager.train(
      body.modelKey as ModelKey,
      body.symbol,
      body.timeframe as Timeframe,
      { horizon: body.horizon, limit: body.limit, activate: body.activate },
    );
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
