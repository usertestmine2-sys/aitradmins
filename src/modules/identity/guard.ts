// AITradeMinds — Identity Guard. Request -> AuthContext; RBAC enforcement.
// Used by all protected routes. Reuses the single auth service + repository.
import { errors, hashToken } from "@/kernel";
import { identityRepository } from "./repository";
import { authService, type AuthContext } from "./auth-service";

function bearer(req: Request): string | undefined {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
}

/** Resolve an auth context from a session bearer token or an API key. */
export async function getAuthContext(req: Request): Promise<AuthContext | undefined> {
  const token = bearer(req);
  if (token) {
    const ctx = await authService.verify(token);
    if (ctx) return ctx;
  }
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const record = await identityRepository.findApiKey(hashToken(apiKey));
    if (record) {
      await identityRepository.touchApiKey(record.id);
      const roles = await identityRepository.rolesForUser(record.userId);
      const user = await identityRepository.findById(record.userId);
      if (user && user.status === "ACTIVE") {
        return { userId: user.id, email: user.email, roles, tenantId: user.tenantId ?? undefined };
      }
    }
  }
  return undefined;
}

/** Require a valid authenticated context or throw 401. */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) throw errors.unauthorized();
  return ctx;
}

/** Require a specific role (throws 403 if missing). */
export function requireRole(ctx: AuthContext, role: string): void {
  if (!ctx.roles.includes(role)) throw errors.forbidden(`Requires role: ${role}`);
}

/** Require the admin role. */
export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  requireRole(ctx, "admin");
  return ctx;
}
