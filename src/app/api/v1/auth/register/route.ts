import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody, enforceRateLimit, clientKey } from "@/modules/security";
import { authService, bootstrapIdentity } from "@/modules/identity";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    enforceRateLimit(clientKey(req, "auth:register"), 10, 60_000);
    await bootstrapIdentity();
    const body = await parseBody(req, schema);
    const result = await authService.register(body.email, body.password, body.displayName, {
      ip: clientKey(req, "").slice(1),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return okResponse(result, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
