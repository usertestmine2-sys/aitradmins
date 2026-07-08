import { okResponse, toResponse } from "@/kernel";
import { requireAuth, authService } from "@/modules/identity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const user = await authService.me(ctx.userId);
    return okResponse({ user });
  } catch (err) {
    return toResponse(err);
  }
}
