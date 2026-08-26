export type AuthProvider = "email" | "yandex" | "vk";
export type OAuthProvider = Exclude<AuthProvider, "email">;

export type AuthErrorCode =
  | "network_error"
  | "invalid_email"
  | "invalid_code"
  | "code_expired"
  | "too_many_attempts"
  | "resend_too_soon"
  | "oauth_cancelled"
  | "oauth_failed"
  | "account_conflict"
  | "session_expired"
  | "invalid_refresh_token"
  | "invalid_ticket"
  | "ticket_expired"
  | "ticket_already_used"
  | "provider_disabled"
  | "validation"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "server_error"
  | "unknown";

export type AuthUser = {
  id: string;
  email?: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  providers: AuthProvider[];
  createdAt?: string;
  updatedAt?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type UserRecord = {
  id: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AuthIdentityRecord = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  providerEmail: string | null;
  providerEmailVerified: boolean;
  rawProfile: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  deviceId: string | null;
  userAgent: string | null;
  ipHash: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedFromTokenId: string | null;
  createdAt: Date;
};

export type EmailLoginCodeRecord = {
  id: string;
  email: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: Date;
  consumedAt: Date | null;
  lastSentAt: Date | null;
  createdAt: Date;
};

export type OAuthStateRecord = {
  id: string;
  provider: OAuthProvider;
  stateHash: string;
  codeVerifierEncrypted: string | null;
  redirectAfter: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export type LoginTicketRecord = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  ticketHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export type NormalizedOAuthProfile = {
  provider: OAuthProvider;
  subject: string;
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  rawProfile?: unknown;
};

export interface OAuthProviderAdapter {
  provider: OAuthProvider;
  getAuthorizationUrl(params: {
    state: string;
    redirectUri: string;
    codeChallenge?: string;
  }): Promise<string>;
  exchangeCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<unknown>;
  getProfile(providerTokens: unknown): Promise<NormalizedOAuthProfile>;
}

export interface EmailSender {
  sendLoginCode(params: { email: string; code: string; ttlSeconds: number }): Promise<void>;
}
