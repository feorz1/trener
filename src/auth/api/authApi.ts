import { authConfig, envProvidersAvailability, mergeProviderAvailability } from "../config";
import type { AuthApiClient, AuthProvidersAvailability, AuthRefreshResult, AuthSession, AuthUser } from "../types";
import { AuthFlowError, isAuthErrorCode } from "../utils/authErrors";
import { isValidEmail, normalizeEmail } from "../utils/email";
import { withNetworkTimeout } from "@/utils/networkTimeout";

type ErrorPayload = {
  code?: string;
  message?: string;
};

export function createDefaultAuthApi(): AuthApiClient {
  if (authConfig.useMockBackend) {
    return createMockAuthApi();
  }
  if (!authConfig.apiBaseUrl) {
    return createUnavailableAuthApi("Backend URL is not configured");
  }
  return createHttpAuthApi({ baseUrl: authConfig.apiBaseUrl });
}

export function createHttpAuthApi({
  baseUrl,
  timeoutMs,
  fetchImpl = globalThis.fetch
}: {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): AuthApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, input: RequestInit = {}): Promise<T> {
    let response: Response;
    let payload: unknown;
    try {
      [response, payload] = await withNetworkTimeout(
        async (signal) => {
          const nextResponse = await fetchImpl(`${normalizedBaseUrl}${path}`, {
            ...input,
            signal,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...input.headers
            }
          });
          return [nextResponse, await readJson(nextResponse)] as const;
        },
        { timeoutMs, signal: input.signal }
      );
    } catch (error) {
      throw new AuthFlowError("network_error", undefined, { cause: error });
    }

    if (!response.ok) {
      throw errorFromPayload(payload, response.status);
    }
    return payload as T;
  }

  return {
    getAuthProviders() {
      return request<AuthProvidersAvailability>("/auth/providers");
    },
    startEmailLogin(email) {
      return request("/auth/email/start", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email) })
      });
    },
    verifyEmailCode(email, code) {
      return request("/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email), code })
      });
    },
    refresh(refreshToken) {
      return request("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      });
    },
    logout(refreshToken) {
      return request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      });
    },
    deleteAccount(accessToken) {
      return request<void>("/auth/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ confirmation: "DELETE" })
      });
    },
    getMe(accessToken) {
      return request<AuthUser>("/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
  };
}

function createUnavailableAuthApi(message: string): AuthApiClient {
  async function unavailable(): Promise<never> {
    throw new AuthFlowError("server_error", message);
  }
  return {
    getAuthProviders: unavailable,
    startEmailLogin: unavailable,
    verifyEmailCode: unavailable,
    refresh: unavailable,
    logout: unavailable,
    deleteAccount: unavailable,
    getMe: unavailable
  };
}

export function createMockAuthApi({ providers = envProvidersAvailability }: { providers?: AuthProvidersAvailability } = {}): AuthApiClient {
  const availableProviders = mergeProviderAvailability(providers);
  const deletedUserIds = new Set<string>();
  const accountGenerationByEmail = new Map<string, number>();

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
    async deleteAccount(accessToken) {
      const user = parseMockAccessToken(accessToken);
      if (!user || deletedUserIds.has(user.id)) {
        throw new AuthFlowError("session_expired");
      }
      deletedUserIds.add(user.id);
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

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function errorFromPayload(payload: unknown, status: number) {
  const errorPayload = payload && typeof payload === "object" ? (payload as ErrorPayload) : {};
  const code = isAuthErrorCode(errorPayload.code) ? errorPayload.code : status === 401 ? "session_expired" : status >= 500 ? "server_error" : "unknown";
  return new AuthFlowError(code, errorPayload.message);
}
