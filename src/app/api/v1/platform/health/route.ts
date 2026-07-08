import { okResponse, toResponse } from "@/kernel";
import { requireAuth } from "@/modules/identity";
import { healthEngine, bootstrapPlatform } from "@/modules/platform";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    bootstrapPlatform();
    return okResponse(await healthEngine.compute());
  } catch (err) {
    return toResponse(err);
  }
}
