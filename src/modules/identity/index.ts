// AITradeMinds — Identity module barrel.
export { identityRepository } from "./repository";
export { authService, type AuthContext, type PublicUser } from "./auth-service";
export {
  getAuthContext,
  requireAuth,
  requireRole,
  requireAdmin,
} from "./guard";
export { bootstrapIdentity } from "./bootstrap";
export { orgService, type OrgRole } from "./org-service";
