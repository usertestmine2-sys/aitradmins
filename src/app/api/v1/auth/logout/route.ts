import { okResponse, toResponse, errors } from "@/kernel";
import { authService } from "@/modules/identity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw errors.badRequest("Missing bearer token");
    await authService.logout(token, {});
    return okResponse({ loggedOut: true });
  } catch (err) {
    return toResponse(err);
  }
}
