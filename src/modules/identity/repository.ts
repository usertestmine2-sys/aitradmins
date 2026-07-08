// AITradeMinds — Identity Repository. Reuses the single db context (@/db).
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apikeyKeys,
  auditEvents,
  authSessions,
  authzRoles,
  authzUserRoles,
  orgMembers,
  orgOrgs,
  usrUsers,
  type OrgOrg,
  type UsrUser,
} from "@/db/schema";
import { singleton } from "@/kernel";

class IdentityRepository {
  // ---- Users ----
  async createUser(row: {
    email: string;
    passwordHash: string;
    displayName?: string;
  }): Promise<UsrUser> {
    const [user] = await db
      .insert(usrUsers)
      .values({ email: row.email, passwordHash: row.passwordHash, displayName: row.displayName })
      .returning();
    return user;
  }

  async findByEmail(email: string): Promise<UsrUser | undefined> {
    const [user] = await db
      .select()
      .from(usrUsers)
      .where(and(eq(usrUsers.email, email), isNull(usrUsers.deletedAt)))
      .limit(1);
    return user;
  }

  async findById(id: number): Promise<UsrUser | undefined> {
    const [user] = await db
      .select()
      .from(usrUsers)
      .where(and(eq(usrUsers.id, id), isNull(usrUsers.deletedAt)))
      .limit(1);
    return user;
  }

  async listUsers(limit = 100): Promise<UsrUser[]> {
    return db
      .select()
      .from(usrUsers)
      .where(isNull(usrUsers.deletedAt))
      .orderBy(desc(usrUsers.createdAt))
      .limit(limit);
  }

  async countUsers(): Promise<number> {
    const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(usrUsers);
    return row?.c ?? 0;
  }

  // ---- Sessions ----
  async createSession(row: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(authSessions).values(row);
  }

  async findSession(tokenHash: string) {
    const [session] = await db
      .select()
      .from(authSessions)
      .where(and(eq(authSessions.tokenHash, tokenHash), eq(authSessions.revoked, false)))
      .limit(1);
    return session;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await db
      .update(authSessions)
      .set({ revoked: true, updatedAt: sql`now()` })
      .where(eq(authSessions.tokenHash, tokenHash));
  }

  // ---- Roles ----
  async ensureRole(name: string, description?: string): Promise<number> {
    const [role] = await db
      .insert(authzRoles)
      .values({ name, description })
      .onConflictDoNothing()
      .returning({ id: authzRoles.id });
    if (role) return role.id;
    const [existing] = await db
      .select({ id: authzRoles.id })
      .from(authzRoles)
      .where(eq(authzRoles.name, name))
      .limit(1);
    return existing.id;
  }

  async assignRole(userId: number, roleName: string): Promise<void> {
    const roleId = await this.ensureRole(roleName);
    await db
      .insert(authzUserRoles)
      .values({ userId, roleId })
      .onConflictDoNothing();
  }

  async rolesForUser(userId: number): Promise<string[]> {
    const rows = await db
      .select({ name: authzRoles.name })
      .from(authzUserRoles)
      .innerJoin(authzRoles, eq(authzUserRoles.roleId, authzRoles.id))
      .where(eq(authzUserRoles.userId, userId));
    return rows.map((r) => r.name);
  }

  // ---- API keys ----
  async findApiKey(keyHash: string) {
    const [key] = await db
      .select()
      .from(apikeyKeys)
      .where(and(eq(apikeyKeys.keyHash, keyHash), eq(apikeyKeys.revoked, false)))
      .limit(1);
    return key;
  }

  async touchApiKey(id: number): Promise<void> {
    await db.update(apikeyKeys).set({ lastUsedAt: sql`now()` }).where(eq(apikeyKeys.id, id));
  }

  // ---- Organizations ----
  async createOrg(row: {
    name: string;
    slug: string;
    ownerId: number;
  }): Promise<OrgOrg> {
    const [org] = await db.insert(orgOrgs).values(row).returning();
    await db
      .insert(orgMembers)
      .values({ orgId: org.id, userId: row.ownerId, role: "OWNER" })
      .onConflictDoNothing();
    return org;
  }

  async findOrgBySlug(slug: string): Promise<OrgOrg | undefined> {
    const [org] = await db
      .select()
      .from(orgOrgs)
      .where(and(eq(orgOrgs.slug, slug), isNull(orgOrgs.deletedAt)))
      .limit(1);
    return org;
  }

  async orgsForUser(userId: number): Promise<Array<OrgOrg & { role: string }>> {
    const rows = await db
      .select({ org: orgOrgs, role: orgMembers.role })
      .from(orgMembers)
      .innerJoin(orgOrgs, eq(orgMembers.orgId, orgOrgs.id))
      .where(and(eq(orgMembers.userId, userId), isNull(orgOrgs.deletedAt)));
    return rows.map((r) => ({ ...r.org, role: r.role }));
  }

  async orgMembership(orgId: number, userId: number) {
    const [m] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .limit(1);
    return m;
  }

  async addOrgMember(orgId: number, userId: number, role: string): Promise<void> {
    await db
      .insert(orgMembers)
      .values({ orgId, userId, role })
      .onConflictDoUpdate({
        target: [orgMembers.orgId, orgMembers.userId],
        set: { role, updatedAt: sql`now()` },
      });
  }

  async listOrgMembers(orgId: number) {
    return db
      .select({
        userId: orgMembers.userId,
        role: orgMembers.role,
        email: usrUsers.email,
        displayName: usrUsers.displayName,
      })
      .from(orgMembers)
      .innerJoin(usrUsers, eq(orgMembers.userId, usrUsers.id))
      .where(eq(orgMembers.orgId, orgId));
  }

  // ---- Audit ----
  async audit(row: {
    action: string;
    actorId?: string;
    target?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await db.insert(auditEvents).values({
      action: row.action,
      actorId: row.actorId,
      target: row.target,
      details: row.details ?? {},
      ip: row.ip,
    });
  }
}

export const identityRepository = singleton(
  "identity.repository",
  () => new IdentityRepository(),
);
