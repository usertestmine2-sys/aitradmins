import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody, enforceRateLimit, clientKey } from "@/modules/security";
import { authService, bootstrapIdentity } from "@/modules/identity";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    enforceRateLimit(clientKey(req, "auth:login"), 20, 60_000);
    await bootstrapIdentity();
    const body = await parseBody(req, schema);
    const result = await authService.login(body.email, body.password, {
      ip: clientKey(req, "").slice(1),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return okResponse(result);
  } catch (err) {
    return toResponse(err);
  }
}
