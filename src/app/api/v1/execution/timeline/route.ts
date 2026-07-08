import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth } from "@/modules/identity";
import { timelineEngine, executionRepository, bootstrapExecution } from "@/modules/execution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapExecution();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) throw errors.badRequest("orderId is required");
    const existing = await executionRepository.timeline(Number(orderId));
    const timeline = existing ?? (await timelineEngine.build(Number(orderId)));
    return okResponse({ timeline });
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({ orderId: z.number().int().positive() });

// Build (materialize) a timeline for an order.
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    bootstrapExecution();
    const body = await parseBody(req, schema);
    return okResponse({ timeline: await timelineEngine.build(body.orderId) }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
