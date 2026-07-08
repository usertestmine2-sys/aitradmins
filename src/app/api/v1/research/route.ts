import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAdmin, requireAuth } from "@/modules/identity";
import { MODEL_KEYS, type ModelKey } from "@/modules/training";
import { aiBrain, bootstrapBrain, marketDna, digitalTwin } from "@/modules/brain";
import type { Timeframe } from "@/modules/market_data/constants";

export const dynamic = "force-dynamic";

// Research Mode surface. Generates recommendations / simulations ONLY — never
// touches live production memory (Digital Twin + DNA write to Research memory).
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapBrain();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "dna";
    const symbol = searchParams.get("symbol") ?? "RELIANCE";
    const timeframe = (searchParams.get("timeframe") ?? "1D") as Timeframe;
    if (view === "similar") {
      return okResponse({ similar: await marketDna.similar(symbol, timeframe) });
    }
    return okResponse({ symbol, timeframe });
  } catch (err) {
    return toResponse(err);
  }
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("replay"),
    modelKey: z.enum(MODEL_KEYS),
    symbol: z.string().min(1),
    timeframe: z.string().default("1D"),
    window: z.enum(["1M", "3M", "6M", "1Y", "5Y"]),
  }),
  z.object({
    action: z.literal("extractDna"),
    symbol: z.string().min(1),
    timeframe: z.string().default("1D"),
  }),
  z.object({
    action: z.literal("digitalTwin"),
    symbol: z.string().min(1),
    timeframe: z.string().default("1D"),
    entryOffset: z.number().int().optional(),
    holding: z.number().int().positive().optional(),
  }),
]);

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapBrain();
    const body = await parseBody(req, bodySchema);

    if (body.action === "replay") {
      const result = await aiBrain.research(
        body.modelKey as ModelKey,
        body.symbol,
        body.timeframe,
        body.window,
      );
      return okResponse(result, { status: 201 });
    }
    if (body.action === "extractDna") {
      const result = await marketDna.extract(body.symbol, body.timeframe as Timeframe);
      return okResponse(result, { status: 201 });
    }
    // digitalTwin
    const result = await digitalTwin.simulate(body.symbol, body.timeframe as Timeframe, {
      entryOffset: body.entryOffset,
      holding: body.holding,
    });
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
