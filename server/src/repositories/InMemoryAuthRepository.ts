import { randomUUID } from "node:crypto";
import type { AuthIdentityRecord, AuthProvider, EmailLoginCodeRecord, LoginTicketRecord, OAuthProvider, OAuthStateRecord, RefreshTokenRecord, UserRecord } from "../types";
import type { AuthRepository, CreateUserInput, UpsertIdentityInput } from "./AuthRepository";

export class InMemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, UserRecord>();
  readonly identities = new Map<string, AuthIdentityRecord>();
  readonly emailCodes = new Map<string, EmailLoginCodeRecord>();
  readonly refreshTokens = new Map<string, RefreshTokenRecord>();
  readonly oauthStates = new Map<string, OAuthStateRecord>();
  readonly loginTickets = new Map<string, LoginTicketRecord>();

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    const normalized = email.toLowerCase();
    return [...this.users.values()].find((user) => user.email?.toLowerCase() === normalized && !user.deletedAt) ?? null;
  }

  async createUser(input: CreateUserInput) {
    const normalizedEmail = input.email?.toLowerCase() ?? null;
    if (
      normalizedEmail &&
      [...this.users.values()].some((user) => !user.deletedAt && user.email?.toLowerCase() === normalizedEmail)
    ) {
      throw new Error("Active user email already exists");
    }
    const now = new Date();
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email ?? null,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      lastSeenAt: input.lastSeenAt ?? null,
      blockedAt: input.blockedAt ?? null,
      blockedReason: input.blockedReason ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, input: Partial<CreateUserInput>) {
    const user = this.users.get(id);
    if (!user) throw new Error(`User not found: ${id}`);
    const updated: UserRecord = {
      ...user,
      email: input.email === undefined ? user.email : input.email ?? null,
      emailVerifiedAt: input.emailVerifiedAt === undefined ? user.emailVerifiedAt : input.emailVerifiedAt ?? null,
      displayName: input.displayName === undefined ? user.displayName : input.displayName ?? null,
      avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl ?? null,
      lastSeenAt: input.lastSeenAt === undefined ? user.lastSeenAt : input.lastSeenAt ?? null,
      blockedAt: input.blockedAt === undefined ? user.blockedAt : input.blockedAt ?? null,
      blockedReason: input.blockedReason === undefined ? user.blockedReason : input.blockedReason ?? null,
      updatedAt: new Date()
    };
    this.users.set(id, updated);
    return updated;
  }

  async listIdentitiesForUser(userId: string) {
    return [...this.identities.values()].filter((identity) => identity.userId === userId);
  }

  async findIdentity(provider: AuthProvider, providerSubject: string) {
    return this.identities.get(identityKey(provider, providerSubject)) ?? null;
  }

  async upsertIdentity(input: UpsertIdentityInput) {
    const key = identityKey(input.provider, input.providerSubject);
    const existing = this.identities.get(key);
    const now = new Date();
    const identity: AuthIdentityRecord = {
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      provider: input.provider,
      providerSubject: input.providerSubject,
      providerEmail: input.providerEmail ?? null,
      providerEmailVerified: input.providerEmailVerified ?? false,
      rawProfile: input.rawProfile ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.identities.set(key, identity);
    return identity;
  }

  async createEmailCode(input: { email: string; codeHash: string; expiresAt: Date; lastSentAt: Date }) {
    const latestCreatedAt = Math.max(0, ...[...this.emailCodes.values()].map((record) => record.createdAt.getTime()));
    const now = new Date(Math.max(Date.now(), latestCreatedAt + 1));
    const record: EmailLoginCodeRecord = {
      id: randomUUID(),
      email: input.email,
      codeHash: input.codeHash,
      attemptCount: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
      lastSentAt: input.lastSentAt,
      createdAt: now
    };
    this.emailCodes.set(record.id, record);
    return record;
  }

  async findLatestEmailCode(email: string) {
    return [...this.emailCodes.values()]
      .filter((record) => record.email === email)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
  }

  async incrementEmailCodeAttempts(id: string) {
    const record = this.emailCodes.get(id);
    if (!record) throw new Error(`Email code not found: ${id}`);
    const updated = { ...record, attemptCount: record.attemptCount + 1 };
    this.emailCodes.set(id, updated);
    return updated;
  }

  async consumeEmailCode(id: string) {
    const record = this.emailCodes.get(id);
    if (!record) throw new Error(`Email code not found: ${id}`);
    if (record.consumedAt) return null;
    const updated = { ...record, consumedAt: new Date() };
    this.emailCodes.set(id, updated);
    return updated;
  }

  async createRefreshToken(input: { userId: string; tokenHash: string; deviceId?: string | null; userAgent?: string | null; ipHash?: string | null; expiresAt: Date; rotatedFromTokenId?: string | null }) {
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      deviceId: input.deviceId ?? null,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
      expiresAt: input.expiresAt,
      revokedAt: null,
      rotatedFromTokenId: input.rotatedFromTokenId ?? null,
      createdAt: new Date()
    };
    this.refreshTokens.set(record.id, record);
    return record;
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return [...this.refreshTokens.values()].find((record) => record.tokenHash === tokenHash) ?? null;
  }

  async revokeRefreshToken(id: string) {
    const record = this.refreshTokens.get(id);
    if (!record) return null;
    const updated = { ...record, revokedAt: record.revokedAt ?? new Date() };
    this.refreshTokens.set(id, updated);
    return updated;
  }

  async revokeRefreshTokenFamily(userId: string, deviceId?: string | null) {
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId && (deviceId === undefined || record.deviceId === deviceId)) {
        await this.revokeRefreshToken(record.id);
      }
    }
  }

  async createOAuthState(input: { provider: OAuthProvider; stateHash: string; codeVerifierEncrypted?: string | null; redirectAfter?: string | null; expiresAt: Date }) {
    const record: OAuthStateRecord = {
      id: randomUUID(),
      provider: input.provider,
      stateHash: input.stateHash,
      codeVerifierEncrypted: input.codeVerifierEncrypted ?? null,
      redirectAfter: input.redirectAfter ?? null,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: new Date()
    };
    this.oauthStates.set(record.id, record);
    return record;
  }

  async findOAuthStateByHash(stateHash: string) {
    return [...this.oauthStates.values()].find((record) => record.stateHash === stateHash) ?? null;
  }

  async consumeOAuthState(id: string) {
    const record = this.oauthStates.get(id);
    if (!record) throw new Error(`OAuth state not found: ${id}`);
    const updated = { ...record, consumedAt: new Date() };
    this.oauthStates.set(id, updated);
    return updated;
  }

  async createLoginTicket(input: { userId: string; provider: OAuthProvider; ticketHash: string; expiresAt: Date }) {
    const record: LoginTicketRecord = {
      id: randomUUID(),
      userId: input.userId,
      provider: input.provider,
      ticketHash: input.ticketHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: new Date()
    };
    this.loginTickets.set(record.id, record);
    return record;
  }

  async findLoginTicketByHash(ticketHash: string) {
    return [...this.loginTickets.values()].find((record) => record.ticketHash === ticketHash) ?? null;
  }

  async consumeLoginTicket(id: string) {
    const record = this.loginTickets.get(id);
    if (!record) throw new Error(`Login ticket not found: ${id}`);
    const updated = { ...record, consumedAt: new Date() };
    this.loginTickets.set(id, updated);
    return updated;
  }
}

function identityKey(provider: AuthProvider, providerSubject: string) {
  return `${provider}:${providerSubject}`;
}
