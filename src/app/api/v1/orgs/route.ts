import { z } from "zod";
import { okResponse, toResponse } from "@/kernel";
import { parseBody } from "@/modules/security";
import { requireAuth, orgService } from "@/modules/identity";

export const dynamic = "force-dynamic";

const createSchema = z.object({ name: z.string().min(2).max(120) });

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const orgs = await orgService.listForUser(ctx);
    return okResponse({ orgs });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth(req);
    const body = await parseBody(req, createSchema);
    const org = await orgService.create(ctx, body.name);
    return okResponse({ org }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
