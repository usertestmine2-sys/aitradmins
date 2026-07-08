import { okResponse, toResponse } from "@/kernel";
import { requireAdmin } from "@/modules/identity";
import { infraRepository, scheduler } from "@/modules/infra";
import { platformRepository, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

// Recovery status: scheduler state, recent job outcomes, open critical alerts.
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapPlatform();
    const jobs = await infraRepository.recentJobs(50);
    const alerts = await platformRepository.openAlerts();
    return okResponse({
      scheduler: scheduler.status(),
      recentJobs: jobs.map((j) => ({ name: j.name, status: j.status, durationMs: j.durationMs })),
      failedJobs: jobs.filter((j) => j.status === "FAILED").length,
      openCriticalAlerts: alerts.filter((a) => a.severity === "CRITICAL").length,
    });
  } catch (err) {
    return toResponse(err);
  }
}
