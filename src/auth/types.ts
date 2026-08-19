export type AuthProvider = "email" | "yandex" | "vk";

export type AuthStatus = "checking" | "unauthenticated" | "authenticating" | "authenticated" | "error";

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

export type AuthProvidersAvailability = {
  email: boolean;
  yandex: boolean;
  vk: boolean;
};

export type AuthErrorCode =
  | "network_error"
  | "invalid_email"
  | "invalid_code"
  | "code_expired"
  | "too_many_attempts"
  | "resend_too_soon"
  | "session_expired"
  | "invalid_refresh_token"
  | "provider_disabled"
  | "server_error"
  | "unknown";

export type AuthError = {
  code: AuthErrorCode;
  message: string;
};

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  pendingEmail: string | null;
  providers: AuthProvidersAvailability | null;
};

export type EmailLoginStartResult = {
  ok: true;
  ttlSeconds: number;
  resendAfterSeconds: number;
};

export type AuthRefreshResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export interface AuthApiClient {
  getAuthProviders(): Promise<AuthProvidersAvailability>;
  startEmailLogin(email: string): Promise<EmailLoginStartResult>;
  verifyEmailCode(email: string, code: string): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthRefreshResult>;
  logout(refreshToken: string): Promise<void>;
  deleteAccount(accessToken: string | null, operationId: string, recoverySecret: string): Promise<void>;
  getMe(accessToken: string): Promise<AuthUser>;
}

export type AuthorizedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface TokenStorage {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  removeRefreshToken(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string): Promise<void>;
  removeAccessToken(): Promise<void>;
  clearAuthTokens(): Promise<void>;
}
