import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { analyticsService, bootstrapAnalytics } from "@/modules/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapAnalytics();
    return okResponse(await analyticsService.dashboard());
  } catch (err) {
    return toResponse(err);
  }
}
