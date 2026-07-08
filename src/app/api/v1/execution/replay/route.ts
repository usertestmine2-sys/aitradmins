import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { replayEngine, executionRepository, bootstrapExecution } from "@/modules/execution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapExecution();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) throw errors.badRequest("orderId is required");
    const existing = await executionRepository.replay(Number(orderId));
    const replay = existing ?? (await replayEngine.replay(Number(orderId)));
    return okResponse({ replay });
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({ orderId: z.number().int().positive() });

// Run a step-by-step replay for a historical order.
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    bootstrapExecution();
    const body = await parseBody(req, schema);
    return okResponse({ replay: await replayEngine.replay(body.orderId) }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
