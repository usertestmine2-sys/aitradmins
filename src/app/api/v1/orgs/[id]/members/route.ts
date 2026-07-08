import { z } from "zod";
import { okResponse, toResponse, errors } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth, orgService, type OrgRole } from "@/modules/identity";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
});

function orgIdFrom(params: { id: string }): number {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw errors.badRequest("Invalid org id");
  return id;
}

export async function GET(req: Request, ctxArg: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth(req);
    const orgId = orgIdFrom(await ctxArg.params);
    const members = await orgService.members(ctx, orgId);
    return okResponse({ members });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(req: Request, ctxArg: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth(req);
    const orgId = orgIdFrom(await ctxArg.params);
    const body = await parseBody(req, addSchema);
    await orgService.addMember(ctx, orgId, body.userId, body.role as OrgRole);
    const members = await orgService.members(ctx, orgId);
    return okResponse({ members }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
