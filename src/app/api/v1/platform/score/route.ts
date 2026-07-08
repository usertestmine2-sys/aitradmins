import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { healthEngine, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

// Platform quality score dimensions (reliability, explainability, AI score, ...).
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    const health = await healthEngine.compute();
    return okResponse({
      overallScore: health.overallScore,
      grade: health.grade,
      dimensions: health.platformScore,
    });
  } catch (err) {
    return toResponse(err);
  }
}
