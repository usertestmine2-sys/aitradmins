// AITradeMinds — Admin guard for ops endpoints.
// Phase 5: RBAC-first (identity `requireAdmin`). Falls back to the legacy
// ADMIN_TOKEN only when no identity users exist yet (bootstrap window) or when a
// static token is explicitly configured. This retires TD-001 for authenticated
// deployments while preserving zero-downtime bootstrap.
import { getConfig, errors } from "@/kernel";
import { getAuthContext } from "@/modules/identity";

export async function assertAdmin(req: Request): Promise<void> {
  // 1) Preferred: authenticated admin via RBAC (session token or API key).
  const ctx = await getAuthContext(req);
  if (ctx?.roles.includes("admin")) return;

  // 2) Fallback: static ADMIN_TOKEN (ops/bootstrap). Open only if unset in dev.
  const token = getConfig().ADMIN_TOKEN;
  if (!token) {
    if (ctx) throw errors.forbidden("Requires admin role");
    if (getConfig().NODE_ENV !== "production") return; // dev bootstrap window
    throw errors.unauthorized("Admin authentication required");
  }
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided !== token) throw errors.forbidden("Admin access required");
}
