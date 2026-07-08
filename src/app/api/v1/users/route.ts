import { okResponse, toResponse } from "@/kernel";
import { requireAdmin, identityRepository } from "@/modules/identity";

export const dynamic = "force-dynamic";

// Admin-only user listing (RBAC enforced).
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const users = await identityRepository.listUsers(200);
    // Never expose password hashes.
    const safe = users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      status: u.status,
      createdAt: u.createdAt,
    }));
    return okResponse({ users: safe, count: safe.length });
  } catch (err) {
    return toResponse(err);
  }
}
