import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { masterPipeline, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    return okResponse({ recentRuns: await masterPipeline.history(25) });
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(["NSE", "BSE"]).optional(),
  regime: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  autoExecutePaper: z.boolean().optional(),
});

// Run the Master Execution Pipeline for a symbol (recommend-only unless autoExecutePaper).
export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    bootstrapPlatform();
    const body = await parseBody(req, schema);
    const result = await masterPipeline.run({ userId: ctx.userId, ...body });
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
