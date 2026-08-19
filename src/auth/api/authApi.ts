import { authConfig, envProvidersAvailability, mergeProviderAvailability } from "../config";
import type { AuthApiClient, AuthProvidersAvailability, AuthRefreshResult, AuthSession, AuthUser } from "../types";
import { AuthFlowError } from "../utils/authErrors";
import { isValidEmail, normalizeEmail } from "../utils/email";
import { createHttpAuthApi, createUnavailableAuthApi } from "./httpAuthApi";

export { createHttpAuthApi } from "./httpAuthApi";

export function createDefaultAuthApi(): AuthApiClient {
  if (authConfig.useMockBackend) {
    return createMockAuthApi();
  }
  if (!authConfig.apiBaseUrl) {
    return createUnavailableAuthApi("Backend URL is not configured");
  }
  return createHttpAuthApi({ baseUrl: authConfig.apiBaseUrl });
}

export function createMockAuthApi({ providers = envProvidersAvailability }: { providers?: AuthProvidersAvailability } = {}): AuthApiClient {
  const availableProviders = mergeProviderAvailability(providers);
  const deletedUserIds = new Set<string>();
  const accountGenerationByEmail = new Map<string, number>();
  const completedAccountDeletions = new Map<string, { userId: string; recoverySecret: string }>();

  return {
    async getAuthProviders() {
      return availableProviders;
    },
    async startEmailLogin(email) {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) {
        throw new AuthFlowError("invalid_email");
      }
      return {
        ok: true,
        ttlSeconds: 300,
        resendAfterSeconds: 60
      };
    },
    async verifyEmailCode(email, code) {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) {
        throw new AuthFlowError("invalid_email");
      }
      if (code !== "111111") {
        throw new AuthFlowError("invalid_code");
      }
      const baseUserId = createMockUserId(normalized);
      let generation = accountGenerationByEmail.get(normalized) ?? 0;
      let userId = generation === 0 ? baseUserId : `${baseUserId}-${generation}`;
      while (deletedUserIds.has(userId)) {
        generation += 1;
        userId = `${baseUserId}-${generation}`;
      }
      accountGenerationByEmail.set(normalized, generation);
      return createMockSession({ email: normalized, providers: ["email"], userId });
    },
    async refresh(refreshToken) {
      const user = parseMockRefreshToken(refreshToken);
      if (!user || deletedUserIds.has(user.id)) {
        throw new AuthFlowError("session_expired");
      }
      return createMockTokens(user);
    },
    async logout() {
      return undefined;
    },
    async deleteAccount(accessToken, operationId, recoverySecret) {
      const completed = completedAccountDeletions.get(operationId);
      if (completed?.recoverySecret === recoverySecret) return;
      const user = accessToken ? parseMockAccessToken(accessToken) : null;
      if (!user || deletedUserIds.has(user.id) || completed) {
        throw new AuthFlowError("session_expired");
      }
      deletedUserIds.add(user.id);
      completedAccountDeletions.set(operationId, { userId: user.id, recoverySecret });
    },
    async getMe(accessToken) {
      const user = parseMockAccessToken(accessToken);
      if (!user || deletedUserIds.has(user.id)) {
        throw new AuthFlowError("session_expired");
      }
      return user;
    }
  };
}

function createMockSession(input: { email: string; displayName?: string; providers: AuthUser["providers"]; userId?: string }): AuthSession {
  const now = new Date().toISOString();
  const user: AuthUser = {
    id: input.userId ?? createMockUserId(input.email),
    email: input.email,
    emailVerified: true,
    displayName: input.displayName ?? "Тренер",
    avatarUrl: null,
    providers: input.providers,
    createdAt: now,
    updatedAt: now
  };
  const tokens = createMockTokens(user);
  return {
    ...tokens,
    user
  };
}

function createMockUserId(email: string) {
  return `user-${email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function createMockTokens(user: AuthUser): AuthRefreshResult {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const encodedUser = encodeURIComponent(JSON.stringify(user));
  return {
    accessToken: `mock-access:${encodedUser}`,
    refreshToken: `mock-refresh:${encodedUser}`,
    expiresAt
  };
}

function parseMockAccessToken(token: string): AuthUser | null {
  return parseMockUserToken(token, "mock-access:");
}

function parseMockRefreshToken(token: string): AuthUser | null {
  return parseMockUserToken(token, "mock-refresh:");
}

function parseMockUserToken(token: string, prefix: string): AuthUser | null {
  if (!token.startsWith(prefix)) return null;
  try {
    return JSON.parse(decodeURIComponent(token.slice(prefix.length))) as AuthUser;
  } catch {
    return null;
  }
}
