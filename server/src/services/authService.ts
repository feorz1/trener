import type { AuthServerConfig } from "../config";
import { providerConfigured } from "../config";
import { AuthApiError } from "../errors";
import type { AccountDeletionRepository } from "../accountDeletion/types";
import type { AuthRepository } from "../repositories/AuthRepository";
import { createCodeChallenge, decryptSecret, encryptSecret, hashSecret, randomNumericCode, randomToken, safeCompareHash, signAccessToken, verifyAccessToken } from "../security";
import type { AuthProvider, AuthSession, AuthUser, EmailSender, NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter, UserRecord } from "../types";

type RequestMeta = {
  ip?: string;
  userAgent?: string | null;
  deviceId?: string | null;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export class AuthService {
  private readonly rateLimits = new Map<string, RateLimitBucket>();

  constructor(
    private readonly config: AuthServerConfig,
    private readonly repository: AuthRepository,
    private readonly accountDeletionRepository: AccountDeletionRepository,
    private readonly emailSender: EmailSender,
    private readonly oauthAdapters: Record<OAuthProvider, OAuthProviderAdapter>
  ) {}

  getProviders() {
    return {
      email: this.config.authEnabled && this.config.providerFlags.email,
      yandex: providerConfigured(this.config, "yandex"),
      vk: providerConfigured(this.config, "vk")
    };
  }

  async startEmailLogin(emailInput: string, meta: RequestMeta = {}) {
    this.ensureProviderEnabled("email");
    const email = normalizeEmail(emailInput);
    if (!isValidEmail(email)) throw new AuthApiError("invalid_email", 400);

    this.consumeRateLimit(`email-start:email:${email}`, this.config.rateLimits.emailStartPerEmail);
    this.consumeRateLimit(`email-start:ip:${meta.ip ?? "unknown"}`, this.config.rateLimits.emailStartPerIp);

    const latest = await this.repository.findLatestEmailCode(email);
    const now = new Date();
    if (latest?.lastSentAt && now.getTime() - latest.lastSentAt.getTime() < this.config.emailCodes.resendSeconds * 1000) {
      throw new AuthApiError("resend_too_soon", 429);
    }

    const code = randomNumericCode(this.config.emailCodes.length);
    await this.repository.createEmailCode({
      email,
      codeHash: this.hashEmailCode(email, code),
      expiresAt: new Date(now.getTime() + this.config.emailCodes.ttlSeconds * 1000),
      lastSentAt: now
    });
    await this.emailSender.sendLoginCode({ email, code, ttlSeconds: this.config.emailCodes.ttlSeconds });
    return {
      ok: true as const,
      ttlSeconds: this.config.emailCodes.ttlSeconds,
      resendAfterSeconds: this.config.emailCodes.resendSeconds
    };
  }

  async verifyEmailCode(emailInput: string, code: string, meta: RequestMeta = {}) {
    this.ensureProviderEnabled("email");
    const email = normalizeEmail(emailInput);
    if (!isValidEmail(email)) throw new AuthApiError("invalid_email", 400);
    if (!/^\d{6}$/.test(code)) throw new AuthApiError("invalid_code", 400);

    this.consumeRateLimit(`email-verify:email:${email}`, this.config.rateLimits.emailVerifyPerEmail);
    this.consumeRateLimit(`email-verify:ip:${meta.ip ?? "unknown"}`, this.config.rateLimits.emailVerifyPerEmail);

    const latest = await this.repository.findLatestEmailCode(email);
    if (!latest) throw new AuthApiError("invalid_code", 400);
    if (latest.consumedAt) throw new AuthApiError("invalid_code", 400);
    if (latest.expiresAt.getTime() <= Date.now()) throw new AuthApiError("code_expired", 400);
    if (latest.attemptCount >= this.config.emailCodes.maxAttempts) throw new AuthApiError("too_many_attempts", 429);

    const claimed = await this.repository.claimEmailCodeAttempt(latest.id, new Date(), this.config.emailCodes.maxAttempts);
    if (!claimed) {
      const current = await this.repository.findLatestEmailCode(email);
      if (current?.expiresAt && current.expiresAt.getTime() <= Date.now()) throw new AuthApiError("code_expired", 400);
      if (current && current.attemptCount >= this.config.emailCodes.maxAttempts) {
        throw new AuthApiError("too_many_attempts", 429);
      }
      throw new AuthApiError("invalid_code", 400);
    }

    const expectedHash = this.hashEmailCode(email, code);
    if (!safeCompareHash(claimed.codeHash, expectedHash)) {
      if (claimed.attemptCount >= this.config.emailCodes.maxAttempts) throw new AuthApiError("too_many_attempts", 429);
      throw new AuthApiError("invalid_code", 400);
    }

    const consumedCode = await this.repository.consumeEmailCode(claimed.id);
    if (!consumedCode) throw new AuthApiError("invalid_code", 400);
    let user = await this.repository.findUserByEmail(email);
    if (!user) {
      try {
        user = await this.repository.createUser({
          email,
          emailVerifiedAt: new Date()
        });
      } catch (error) {
        // A case-insensitive database uniqueness constraint arbitrates two
        // different valid codes verified concurrently for the same email.
        user = await this.repository.findUserByEmail(email);
        if (!user) throw error;
      }
    } else if (!user.emailVerifiedAt) {
      user = await this.repository.updateUser(user.id, { emailVerifiedAt: new Date() });
    }
    this.assertUserCanAuthenticate(user);
    await this.repository.upsertIdentity({
      userId: user.id,
      provider: "email",
      providerSubject: email,
      providerEmail: email,
      providerEmailVerified: true
    });
    return this.createSession(user, meta);
  }

  async startOAuth(provider: OAuthProvider, returnTo = "app", meta: RequestMeta = {}) {
    this.ensureProviderEnabled(provider);
    this.consumeRateLimit(`oauth-start:${provider}:ip:${meta.ip ?? "unknown"}`, this.config.rateLimits.oauthStartPerIp);

    const state = randomToken(32);
    const codeVerifier = randomToken(48);
    const redirectUri = this.config.oauth[provider].redirectUri;
    await this.repository.createOAuthState({
      provider,
      stateHash: hashSecret(state, this.config.oauthState.pepper),
      codeVerifierEncrypted: encryptSecret(codeVerifier, this.config.oauthState.encryptionSecret),
      redirectAfter: returnTo,
      expiresAt: new Date(Date.now() + this.config.oauthState.ttlSeconds * 1000)
    });
    return this.oauthAdapters[provider].getAuthorizationUrl({
      state,
      redirectUri,
      codeChallenge: createCodeChallenge(codeVerifier)
    });
  }

  async handleOAuthCallback(provider: OAuthProvider, query: { code?: string; state?: string; error?: string }) {
    this.ensureProviderEnabled(provider);
    if (query.error) {
      return this.buildAppRedirect(provider, { error: query.error === "access_denied" ? "oauth_cancelled" : "oauth_failed" });
    }
    if (!query.code || !query.state) {
      return this.buildAppRedirect(provider, { error: "oauth_failed" });
    }

    try {
      const state = await this.repository.findOAuthStateByHash(hashSecret(query.state, this.config.oauthState.pepper));
      if (!state || state.provider !== provider || state.expiresAt.getTime() <= Date.now() || state.consumedAt) {
        return this.buildAppRedirect(provider, { error: "oauth_failed" });
      }
      await this.repository.consumeOAuthState(state.id);
      const codeVerifier = state.codeVerifierEncrypted ? decryptSecret(state.codeVerifierEncrypted, this.config.oauthState.encryptionSecret) : undefined;
      const providerTokens = await this.oauthAdapters[provider].exchangeCode({
        code: query.code,
        redirectUri: this.config.oauth[provider].redirectUri,
        codeVerifier
      });
      const profile = await this.oauthAdapters[provider].getProfile(providerTokens);
      const user = await this.resolveOAuthUser(profile);
      const ticket = randomToken(32);
      await this.repository.createLoginTicket({
        userId: user.id,
        provider,
        ticketHash: hashSecret(ticket, this.config.loginTicket.pepper),
        expiresAt: new Date(Date.now() + this.config.loginTicket.ttlSeconds * 1000)
      });
      return this.buildAppRedirect(provider, { ticket });
    } catch {
      return this.buildAppRedirect(provider, { error: "oauth_failed" });
    }
  }

  async exchangeLoginTicket(ticket: string, meta: RequestMeta = {}) {
    const record = await this.repository.findLoginTicketByHash(hashSecret(ticket, this.config.loginTicket.pepper));
    if (!record) throw new AuthApiError("invalid_ticket", 400);
    this.ensureProviderEnabled(record.provider);
    if (record.consumedAt) throw new AuthApiError("ticket_already_used", 400);
    if (record.expiresAt.getTime() <= Date.now()) throw new AuthApiError("ticket_expired", 400);
    const consumed = await this.repository.consumeLoginTicket(record.id);
    if (!consumed) throw new AuthApiError("ticket_already_used", 400);
    const user = await this.repository.findUserById(record.userId);
    if (!user || user.deletedAt) throw new AuthApiError("invalid_ticket", 400);
    this.assertUserCanAuthenticate(user);
    return this.createSession(user, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}) {
    const tokenHash = hashSecret(refreshToken, this.config.tokens.refreshPepper);
    const token = await this.repository.findRefreshTokenByHash(tokenHash);
    if (!token) throw new AuthApiError("invalid_refresh_token", 401);
    if (token.revokedAt) {
      await this.repository.revokeRefreshTokenFamily(token.userId, token.deviceId ?? undefined);
      throw new AuthApiError("invalid_refresh_token", 401);
    }
    if (token.expiresAt.getTime() <= Date.now()) {
      await this.repository.revokeRefreshToken(token.id);
      throw new AuthApiError("session_expired", 401);
    }
    const user = await this.repository.findUserById(token.userId);
    if (!user || user.deletedAt) throw new AuthApiError("session_expired", 401);
    this.assertUserCanAuthenticate(user);
    const nextTokens = this.buildTokenPair(user.id, {
      // The refresh family is immutable. A request header may describe the
      // caller, but it must never move the successor outside reuse revocation.
      deviceId: token.deviceId,
      userAgent: meta.userAgent ?? token.userAgent,
      ip: meta.ip,
      rotatedFromTokenId: token.id
    });
    const rotated = await this.repository.rotateRefreshToken(token.id, nextTokens.record, new Date());
    if (!rotated) {
      await this.repository.revokeRefreshTokenFamily(token.userId, token.deviceId ?? undefined);
      throw new AuthApiError("invalid_refresh_token", 401);
    }
    return nextTokens.response;
  }

  async logout(refreshToken: string) {
    const token = await this.repository.findRefreshTokenByHash(hashSecret(refreshToken, this.config.tokens.refreshPepper));
    if (token) {
      await this.repository.revokeRefreshToken(token.id);
    }
    return { ok: true as const };
  }

  async deleteAccount(
    accessToken: string | null,
    confirmation: unknown,
    operationIdInput: unknown,
    recoverySecretInput: unknown
  ) {
    if (confirmation !== "DELETE") throw new AuthApiError("validation", 400);
    const operationId = readDeletionOperationId(operationIdInput);
    const recoverySecret = readDeletionRecoverySecret(recoverySecretInput);
    const recoverySecretHash = hashSecret(
      `account-deletion-recovery:${operationId}:${recoverySecret}`,
      this.config.tokens.refreshPepper
    );
    const receipt = await this.accountDeletionRepository.findDeletionReceipt(operationId);
    if (receipt) {
      if (!safeCompareHash(receipt.recoverySecretHash, recoverySecretHash)) {
        throw new AuthApiError("session_expired", 401);
      }
      return;
    }
    if (!accessToken) throw new AuthApiError("session_expired", 401);

    const user = await this.requireAuthenticatedUser(accessToken, { allowBlocked: true });
    const expiresAt = new Date(Date.now() + this.config.accountDeletion.receiptTtlHours * 60 * 60 * 1000);
    const deleted = await this.accountDeletionRepository.deleteAccount(
      user.id,
      operationId,
      recoverySecretHash,
      expiresAt
    );
    if (deleted.email) this.clearEmailRateLimits(deleted.email);
  }

  async getMe(accessToken: string) {
    const user = await this.requireAuthenticatedUser(accessToken);
    await this.repository.updateUser(user.id, { lastSeenAt: new Date() });
    return this.toAuthUser(user);
  }

  private async resolveOAuthUser(profile: NormalizedOAuthProfile) {
    const existingIdentity = await this.repository.findIdentity(profile.provider, profile.subject);
    if (existingIdentity) {
      const user = await this.repository.findUserById(existingIdentity.userId);
      if (!user || user.deletedAt) throw new AuthApiError("oauth_failed", 400);
      this.assertUserCanAuthenticate(user);
      return user;
    }
    const user = await this.repository.createUser({
      email: profile.email ?? null,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      displayName: profile.displayName ?? null,
      avatarUrl: profile.avatarUrl ?? null
    });
    await this.repository.upsertIdentity({
      userId: user.id,
      provider: profile.provider,
      providerSubject: profile.subject,
      providerEmail: profile.email ?? null,
      providerEmailVerified: profile.emailVerified ?? false,
      rawProfile: profile.rawProfile ?? null
    });
    return user;
  }

  private async createSession(user: UserRecord, meta: RequestMeta): Promise<AuthSession> {
    await this.repository.updateUser(user.id, { lastSeenAt: new Date() });
    const tokens = await this.createTokens(user.id, meta);
    return {
      ...tokens,
      user: await this.toAuthUser(user)
    };
  }

  private async createTokens(userId: string, meta: RequestMeta & { rotatedFromTokenId?: string | null }) {
    const tokens = this.buildTokenPair(userId, meta);
    await this.repository.createRefreshToken(tokens.record);
    return tokens.response;
  }

  private buildTokenPair(userId: string, meta: RequestMeta & { rotatedFromTokenId?: string | null }) {
    const signed = signAccessToken({
      userId,
      secret: this.config.tokens.accessSecret,
      ttlMinutes: this.config.tokens.accessTtlMinutes
    });
    const refreshToken = randomToken(48);
    const record = {
      userId,
      tokenHash: hashSecret(refreshToken, this.config.tokens.refreshPepper),
      deviceId: meta.deviceId ?? null,
      userAgent: meta.userAgent ?? null,
      ipHash: meta.ip ? hashSecret(meta.ip, this.config.tokens.refreshPepper) : null,
      expiresAt: new Date(Date.now() + this.config.tokens.refreshTtlDays * 24 * 60 * 60 * 1000),
      rotatedFromTokenId: meta.rotatedFromTokenId ?? null
    };
    return {
      record,
      response: {
        accessToken: signed.token,
        refreshToken,
        expiresAt: signed.expiresAt.toISOString()
      }
    };
  }

  private async toAuthUser(user: UserRecord): Promise<AuthUser> {
    const identities = await this.repository.listIdentitiesForUser(user.id);
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      providers: identities.map((identity) => identity.provider),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private ensureProviderEnabled(provider: AuthProvider) {
    if (provider === "email") {
      if (!this.config.authEnabled || !this.config.providerFlags.email) throw new AuthApiError("provider_disabled", 403);
      return;
    }
    if (!providerConfigured(this.config, provider)) {
      throw new AuthApiError("provider_disabled", 403);
    }
  }

  private assertUserCanAuthenticate(user: UserRecord) {
    if (user.blockedAt) throw new AuthApiError("session_expired", 401);
  }

  private async requireAuthenticatedUser(accessToken: string, options: { allowBlocked?: boolean } = {}) {
    const claims = verifyAccessToken(accessToken, this.config.tokens.accessSecret);
    const user = await this.repository.findUserById(claims.sub);
    if (!user || user.deletedAt) throw new AuthApiError("session_expired", 401);
    if (!options.allowBlocked) this.assertUserCanAuthenticate(user);
    return user;
  }

  private clearEmailRateLimits(email: string) {
    const normalizedEmail = email.toLowerCase();
    for (const key of this.rateLimits.keys()) {
      const emailKey = key.startsWith("email-start:email:")
        ? key.slice("email-start:email:".length)
        : key.startsWith("email-verify:email:")
          ? key.slice("email-verify:email:".length)
          : null;
      if (emailKey?.toLowerCase() === normalizedEmail) this.rateLimits.delete(key);
    }
  }

  private hashEmailCode(email: string, code: string) {
    return hashSecret(`${email}:${code}`, this.config.emailCodes.pepper);
  }

  private consumeRateLimit(key: string, max: number) {
    const now = Date.now();
    const existing = this.rateLimits.get(key);
    if (!existing || existing.resetAt <= now) {
      this.rateLimits.set(key, {
        count: 1,
        resetAt: now + this.config.rateLimits.windowSeconds * 1000
      });
      return;
    }
    if (existing.count >= max) throw new AuthApiError("too_many_attempts", 429);
    existing.count += 1;
  }

  private buildAppRedirect(provider: OAuthProvider, params: { ticket?: string; error?: string }) {
    const url = new URL(this.config.publicAppRedirectUri);
    url.searchParams.set("provider", provider);
    if (params.ticket) url.searchParams.set("ticket", params.ticket);
    if (params.error) url.searchParams.set("error", params.error);
    return url.toString();
  }
}

export function normalizeEmail(email: string) {
  const trimmed = email.trim();
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return trimmed;
  return `${local}@${domain.toLowerCase()}`;
}

function readDeletionOperationId(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new AuthApiError("validation", 400, "operationId is invalid");
  }
  return value.toLowerCase();
}

function readDeletionRecoverySecret(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new AuthApiError("validation", 400, "recoverySecret is invalid");
  }
  return value;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
