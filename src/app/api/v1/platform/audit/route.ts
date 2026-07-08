import { okResponse, toResponse } from "@/kernel";
import { requireAdmin } from "@/modules/identity";
import { platformRepository, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

// Enterprise audit view: pipeline runs + health history (append-only records).
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapPlatform();
    const [runs, health] = await Promise.all([
      platformRepository.runs(50),
      platformRepository.healthHistory(50),
    ]);
    return okResponse({ pipelineRuns: runs, healthHistory: health });
  } catch (err) {
    return toResponse(err);
  }
}
