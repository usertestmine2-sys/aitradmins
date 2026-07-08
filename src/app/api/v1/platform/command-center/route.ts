import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { commandCenter, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

// Read-only unified Brain inspection across all subsystems.
export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    return okResponse(await commandCenter.overview());
  } catch (err) {
    return toResponse(err);
  }
}
