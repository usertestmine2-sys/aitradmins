// AITradeMinds — Authentication Service. Register/login/logout/session verify.
import {
  errors,
  logger,
  randomToken,
  singleton,
} from "@/kernel";
import { hashPassword, verifyPassword, hashToken } from "@/modules/security/kernel";
import { eventBus } from "@/modules/market_data/core/event-bus";
import type { UsrUser } from "@/db/schema";
import { identityRepository } from "./repository";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DEFAULT_ROLE = "trader";

export interface PublicUser {
  id: number;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
}

export interface AuthContext {
  userId: number;
  email: string;
  roles: string[];
  tenantId?: string;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

class AuthService {
  private toPublic(user: UsrUser, roles: string[]): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      roles,
    };
  }

  async register(
    email: string,
    password: string,
    displayName: string | undefined,
    meta: RequestMeta = {},
  ): Promise<{ user: PublicUser; token: string }> {
    const normalized = email.trim().toLowerCase();
    const existing = await identityRepository.findByEmail(normalized);
    if (existing) throw errors.conflict("Email already registered");

    const user = await identityRepository.createUser({
      email: normalized,
      passwordHash: hashPassword(password),
      displayName,
    });
    // First user becomes admin; others get the default role.
    const isFirst = (await identityRepository.countUsers()) === 1;
    await identityRepository.assignRole(user.id, isFirst ? "admin" : DEFAULT_ROLE);
    const roles = await identityRepository.rolesForUser(user.id);

    const token = await this.issueSession(user.id, meta);
    await this.recordAudit("auth.register", user.id, meta.ip);
    logger.info("auth.register", { userId: user.id });
    return { user: this.toPublic(user, roles), token };
  }

  async login(
    email: string,
    password: string,
    meta: RequestMeta = {},
  ): Promise<{ user: PublicUser; token: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await identityRepository.findByEmail(normalized);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await this.recordAudit("auth.login.failed", undefined, meta.ip, normalized);
      throw errors.unauthorized("Invalid credentials");
    }
    if (user.status !== "ACTIVE") throw errors.forbidden("Account is not active");

    const roles = await identityRepository.rolesForUser(user.id);
    const token = await this.issueSession(user.id, meta);
    await this.recordAudit("auth.login", user.id, meta.ip);
    logger.info("auth.login", { userId: user.id });
    return { user: this.toPublic(user, roles), token };
  }

  async logout(token: string, meta: RequestMeta = {}): Promise<void> {
    await identityRepository.revokeSession(hashToken(token));
    await this.recordAudit("auth.logout", undefined, meta.ip);
  }

  /** Resolve a bearer token to an auth context, or undefined if invalid/expired. */
  async verify(token: string): Promise<AuthContext | undefined> {
    const session = await identityRepository.findSession(hashToken(token));
    if (!session) return undefined;
    if (session.expiresAt.getTime() <= Date.now()) return undefined;
    const user = await identityRepository.findById(session.userId);
    if (!user || user.status !== "ACTIVE") return undefined;
    const roles = await identityRepository.rolesForUser(user.id);
    return {
      userId: user.id,
      email: user.email,
      roles,
      tenantId: user.tenantId ?? undefined,
    };
  }

  async me(userId: number): Promise<PublicUser | undefined> {
    const user = await identityRepository.findById(userId);
    if (!user) return undefined;
    const roles = await identityRepository.rolesForUser(user.id);
    return this.toPublic(user, roles);
  }

  private async issueSession(userId: number, meta: RequestMeta): Promise<string> {
    const token = randomToken();
    await identityRepository.createSession({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return token;
  }

  private async recordAudit(
    action: string,
    userId?: number,
    ip?: string,
    target?: string,
  ): Promise<void> {
    await identityRepository.audit({
      action,
      actorId: userId ? String(userId) : undefined,
      target,
      ip,
    });
    eventBus.publish("audit", {
      action,
      actorId: userId ? String(userId) : undefined,
      target,
      ts: Date.now(),
    });
  }
}

export const authService = singleton("identity.authService", () => new AuthService());
