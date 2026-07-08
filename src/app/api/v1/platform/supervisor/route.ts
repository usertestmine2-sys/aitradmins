import { okResponse, toResponse } from "@/kernel";
import { requireAuth, requireAdmin } from "@/modules/identity";
import { supervisor, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    return okResponse({ alerts: await supervisor.recent() });
  } catch (err) {
    return toResponse(err);
  }
}

// Run a supervisor scan (admin) — recommend-only, never auto-activates.
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    bootstrapPlatform();
    return okResponse(await supervisor.scan(), { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
