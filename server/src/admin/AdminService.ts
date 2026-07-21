import bcrypt from "bcryptjs";
import type { AuthServerConfig } from "../config";
import { AuthApiError } from "../errors";
import { hashSecret, randomToken, safeCompareHash } from "../security";
import { normalizeEmail } from "../services/authService";
import type { AdminRepository, AdminRole, AdminSessionRecord, AdminUserRecord, PublicAdminUser, RequestMeta } from "./types";

type LoginResult = {
  admin: PublicAdminUser;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
};

type AuthenticatedAdmin = {
  admin: AdminUserRecord;
  session: AdminSessionRecord;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export class AdminService {
  private readonly loginRateLimits = new Map<string, RateLimitBucket>();

  constructor(
    private readonly config: AuthServerConfig,
    private readonly repository: AdminRepository
  ) {}

  async createInitialAdmin(email: string, password: string, role: AdminRole = "OWNER") {
    const normalizedEmail = normalizeEmail(email);
    validateAdminPassword(password);
    const existing = await this.repository.findAdminByEmail(normalizedEmail);
    if (existing) return toPublicAdmin(existing);
    const passwordHash = await bcrypt.hash(password, 12);
    return toPublicAdmin(await this.repository.createAdminUser({ email: normalizedEmail, passwordHash, role }));
  }

  async login(emailInput: string, password: string, meta: RequestMeta = {}): Promise<LoginResult> {
    this.assertEnabled();
    this.consumeLoginRateLimit(meta.ip ?? "unknown");
    const email = normalizeEmail(emailInput);
    const admin = await this.repository.findAdminByEmail(email);
    const passwordMatches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !admin.isActive || !passwordMatches) {
      throw new AuthApiError("unknown", 401, "Неверная почта или пароль");
    }

    const sessionToken = randomToken(48);
    const csrfToken = randomToken(32);
    const expiresAt = new Date(Date.now() + this.config.admin.sessionTtlDays * 24 * 60 * 60 * 1000);
    const ipHash = meta.ip ? hashSecret(meta.ip, this.config.admin.sessionPepper) : null;
    const session = await this.repository.createAdminSession({
      adminUserId: admin.id,
      tokenHash: this.hashToken(sessionToken),
      csrfTokenHash: this.hashToken(csrfToken),
      userAgent: meta.userAgent ?? null,
      ipHash,
      expiresAt
    });
    await this.repository.updateAdminLastLogin(admin.id, new Date());
    await this.audit(admin.id, "admin.login", null, null, { sessionId: session.id }, meta);

    return {
      admin: toPublicAdmin({ ...admin, lastLoginAt: new Date() }),
      sessionToken,
      csrfToken,
      expiresAt
    };
  }

  async logout(sessionToken: string | null, csrfToken: string | null, meta: RequestMeta = {}) {
    const current = await this.requireSession(sessionToken, csrfToken, true);
    await this.repository.revokeAdminSession(current.session.id);
    await this.audit(current.admin.id, "admin.logout", null, null, { sessionId: current.session.id }, meta);
    return { ok: true as const };
  }

  async requireSession(sessionToken: string | null, csrfToken?: string | null, requireCsrf = false): Promise<AuthenticatedAdmin> {
    this.assertEnabled();
    if (!sessionToken) throw new AuthApiError("session_expired", 401);
    const session = await this.repository.findAdminSessionByTokenHash(this.hashToken(sessionToken));
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.adminUser) {
      throw new AuthApiError("session_expired", 401);
    }
    if (!session.adminUser.isActive) throw new AuthApiError("session_expired", 401);
    if (requireCsrf) {
      if (!csrfToken || !safeCompareHash(session.csrfTokenHash, this.hashToken(csrfToken))) {
        throw new AuthApiError("forbidden", 403, "CSRF token is invalid");
      }
    }
    return { admin: session.adminUser, session };
  }

  assertDangerousRole(admin: AdminUserRecord) {
    if (admin.role !== "OWNER" && admin.role !== "ADMIN") {
      throw new AuthApiError("forbidden", 403);
    }
  }

  async audit(adminUserId: string | null, action: string, targetType: string | null, targetId: string | null, metadata: unknown, meta: RequestMeta = {}) {
    await this.repository.logAudit({
      adminUserId,
      action,
      targetType,
      targetId,
      metadata,
      ipHash: meta.ip ? hashSecret(meta.ip, this.config.admin.sessionPepper) : null,
      userAgent: meta.userAgent ?? null
    });
  }

  toPublicAdmin(admin: AdminUserRecord) {
    return toPublicAdmin(admin);
  }

  private assertEnabled() {
    if (!this.config.admin.enabled) throw new AuthApiError("not_found", 404);
  }

  private hashToken(token: string) {
    return hashSecret(token, this.config.admin.sessionPepper);
  }

  private consumeLoginRateLimit(ip: string) {
    const now = Date.now();
    const existing = this.loginRateLimits.get(ip);
    const windowMs = this.config.admin.loginRateLimitWindowSeconds * 1000;
    if (!existing || existing.resetAt <= now) {
      this.loginRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (existing.count >= this.config.admin.loginRateLimitMax) {
      throw new AuthApiError("too_many_attempts", 429);
    }
    existing.count += 1;
  }
}

export function toPublicAdmin(admin: AdminUserRecord): PublicAdminUser {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null
  };
}

export function validateAdminPassword(password: string) {
  if (password.length < 12) {
    throw new AuthApiError("validation", 400, "Пароль администратора должен быть не короче 12 символов");
  }
}
