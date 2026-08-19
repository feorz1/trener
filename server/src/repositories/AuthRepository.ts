import type { AuthIdentityRecord, AuthProvider, EmailLoginCodeRecord, LoginTicketRecord, OAuthProvider, OAuthStateRecord, RefreshTokenRecord, UserRecord } from "../types";

export type CreateUserInput = {
  email?: string | null;
  emailVerifiedAt?: Date | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastSeenAt?: Date | null;
  blockedAt?: Date | null;
  blockedReason?: string | null;
};

export type UpsertIdentityInput = {
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  providerEmail?: string | null;
  providerEmailVerified?: boolean;
  rawProfile?: unknown | null;
};

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  deviceId?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
  expiresAt: Date;
  rotatedFromTokenId?: string | null;
};

export type RotateRefreshTokenResult = {
  consumed: RefreshTokenRecord;
  successor: RefreshTokenRecord;
};

export interface AuthRepository {
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  updateUser(id: string, input: Partial<CreateUserInput>): Promise<UserRecord>;
  listIdentitiesForUser(userId: string): Promise<AuthIdentityRecord[]>;
  findIdentity(provider: AuthProvider, providerSubject: string): Promise<AuthIdentityRecord | null>;
  upsertIdentity(input: UpsertIdentityInput): Promise<AuthIdentityRecord>;
  createEmailCode(input: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    lastSentAt: Date;
  }): Promise<EmailLoginCodeRecord>;
  findLatestEmailCode(email: string): Promise<EmailLoginCodeRecord | null>;
  claimEmailCodeAttempt(id: string, now: Date, maxAttempts: number): Promise<EmailLoginCodeRecord | null>;
  consumeEmailCode(id: string): Promise<EmailLoginCodeRecord | null>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  rotateRefreshToken(tokenId: string, successor: CreateRefreshTokenInput, now: Date): Promise<RotateRefreshTokenResult | null>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshTokenFamily(userId: string, deviceId?: string | null): Promise<void>;
  createOAuthState(input: {
    provider: OAuthProvider;
    stateHash: string;
    codeVerifierEncrypted?: string | null;
    redirectAfter?: string | null;
    expiresAt: Date;
  }): Promise<OAuthStateRecord>;
  findOAuthStateByHash(stateHash: string): Promise<OAuthStateRecord | null>;
  consumeOAuthState(id: string): Promise<OAuthStateRecord>;
  createLoginTicket(input: {
    userId: string;
    provider: OAuthProvider;
    ticketHash: string;
    expiresAt: Date;
  }): Promise<LoginTicketRecord>;
  findLoginTicketByHash(ticketHash: string): Promise<LoginTicketRecord | null>;
  consumeLoginTicket(id: string): Promise<LoginTicketRecord | null>;
}
