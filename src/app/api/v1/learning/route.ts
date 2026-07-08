import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { learningEngine, trainingRepository, MODEL_KEYS } from "@/modules/training";
import type { ModelKey } from "@/modules/training";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const modelKey = (searchParams.get("modelKey") ?? undefined) as ModelKey | undefined;
    const lessons = await trainingRepository.listLessons(modelKey, 100);
    const stats = modelKey ? await learningEngine.stats(modelKey) : null;
    return okResponse({ lessons, stats });
  } catch (err) {
    return toResponse(err);
  }
}

// Ingest a trade outcome (from Paper Trading in Phase 8, or manual replay today).
const outcomeSchema = z.object({
  modelKey: z.enum(MODEL_KEYS),
  symbol: z.string().min(1),
  strategy: z.string().optional(),
  regime: z.string().optional(),
  expectedReward: z.number(),
  actualReward: z.number(),
  confidence: z.number().min(0).max(1),
  holdingTime: z.number().int().nonnegative().optional(),
  drawdown: z.number().optional(),
  slippage: z.number().optional(),
  source: z.enum(["PAPER", "LIVE", "BACKTEST"]).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const body = await parseBody(req, outcomeSchema);
    const result = await learningEngine.learn({ ...body, modelKey: body.modelKey as ModelKey });
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
