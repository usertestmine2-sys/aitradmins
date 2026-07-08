import { okResponse, toResponse, errors } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { analyticsService, bootstrapAnalytics } from "@/modules/analytics";

export const dynamic = "force-dynamic";

// Unified analytics surface. Every view consumes existing services (read-only).
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapAnalytics();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "dashboard";
    switch (view) {
      case "brain":
        return okResponse(await analyticsService.brain());
      case "models":
        return okResponse({ models: await analyticsService.models() });
      case "training":
        return okResponse(await analyticsService.training());
      case "market":
        return okResponse(await analyticsService.market());
      case "broker":
        return okResponse(await analyticsService.broker());
      case "system":
        return okResponse(await analyticsService.system());
      case "learning":
        return okResponse(await analyticsService.learning());
      case "strategy":
        return okResponse(await analyticsService.strategy());
      case "paper":
        return okResponse(await analyticsService.paperTrading());
      case "risk":
        return okResponse(await analyticsService.risk());
      case "dashboard":
        return okResponse(await analyticsService.dashboard());
      default:
        throw errors.badRequest(`Unknown analytics view: ${view}`);
    }
  } catch (err) {
    return toResponse(err);
  }
}
