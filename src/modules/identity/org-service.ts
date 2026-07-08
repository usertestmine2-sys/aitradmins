// AITradeMinds — Organization Service. Multi-tenant org + membership management.
import { errors, logger, singleton } from "@/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import type { OrgOrg } from "@/db/schema";
import { identityRepository } from "./repository";
import type { AuthContext } from "./auth-service";

const ORG_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

class OrgService {
  async create(ctx: AuthContext, name: string): Promise<OrgOrg> {
    const base = slugify(name);
    if (!base) throw errors.badRequest("Invalid organization name");
    let slug = base;
    let suffix = 1;
    while (await identityRepository.findOrgBySlug(slug)) {
      slug = `${base}-${suffix++}`;
    }
    const org = await identityRepository.createOrg({ name, slug, ownerId: ctx.userId });
    await identityRepository.audit({
      action: "org.create",
      actorId: String(ctx.userId),
      target: slug,
    });
    eventBus.publish("audit", {
      action: "org.create",
      actorId: String(ctx.userId),
      target: slug,
      ts: Date.now(),
    });
    logger.info("org.create", { orgId: org.id, userId: ctx.userId });
    return org;
  }

  async listForUser(ctx: AuthContext) {
    return identityRepository.orgsForUser(ctx.userId);
  }

  private async requireOrgRole(orgId: number, userId: number, roles: OrgRole[]): Promise<void> {
    const membership = await identityRepository.orgMembership(orgId, userId);
    if (!membership) throw errors.forbidden("Not a member of this organization");
    if (!roles.includes(membership.role as OrgRole)) {
      throw errors.forbidden(`Requires org role: ${roles.join("|")}`);
    }
  }

  async addMember(
    ctx: AuthContext,
    orgId: number,
    userId: number,
    role: OrgRole,
  ): Promise<void> {
    await this.requireOrgRole(orgId, ctx.userId, ["OWNER", "ADMIN"]);
    if (!ORG_ROLES.includes(role)) throw errors.badRequest("Invalid org role");
    const target = await identityRepository.findById(userId);
    if (!target) throw errors.notFound("User not found");
    await identityRepository.addOrgMember(orgId, userId, role);
    await identityRepository.audit({
      action: "org.member.add",
      actorId: String(ctx.userId),
      target: `${orgId}:${userId}`,
      details: { role },
    });
  }

  async members(ctx: AuthContext, orgId: number) {
    await this.requireOrgRole(orgId, ctx.userId, ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
    return identityRepository.listOrgMembers(orgId);
  }
}

export const orgService = singleton("identity.orgService", () => new OrgService());
