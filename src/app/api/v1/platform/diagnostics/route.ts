import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { healthEngine, supervisor, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

// Self-diagnostics: best/weakest subsystem + open alerts summary.
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    const health = await healthEngine.compute();
    const alerts = await supervisor.recent();
    const entries = Object.entries(health.subsystems).sort((a, b) => b[1] - a[1]);
    return okResponse({
      overallScore: health.overallScore,
      grade: health.grade,
      bestSubsystem: entries[0] ? { name: entries[0][0], score: entries[0][1] } : null,
      weakestSubsystem: entries.length ? { name: entries[entries.length - 1][0], score: entries[entries.length - 1][1] } : null,
      subsystems: health.subsystems,
      openAlerts: alerts.filter((a) => a.status === "OPEN").length,
      criticalAlerts: alerts.filter((a) => a.status === "OPEN" && a.severity === "CRITICAL").length,
    });
  } catch (err) {
    return toResponse(err);
  }
}
