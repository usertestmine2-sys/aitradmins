import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth, requireAdmin } from "@/modules/identity";
import { selfReview, bootstrapBrain } from "@/modules/brain";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapBrain();
    return okResponse({ reviews: await selfReview.history() });
  } catch (err) {
    return toResponse(err);
  }
}

const schema = z.object({ scope: z.enum(["DAILY", "WEEKLY", "MONTHLY", "REGIME"]).optional() });

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapBrain();
    const body = await parseBody(req, schema);
    const review = await selfReview.run(body.scope ?? "DAILY");
    return okResponse({ review }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
