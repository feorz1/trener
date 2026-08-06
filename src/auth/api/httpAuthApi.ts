import type { AuthApiClient, AuthProvidersAvailability, AuthUser } from "../types";
import { AuthFlowError, isAuthErrorCode } from "../utils/authErrors";
import { normalizeEmail } from "../utils/email";
import { withNetworkTimeout } from "@/utils/networkTimeout";

type ErrorPayload = {
  code?: string;
  message?: string;
};

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
    deleteAccount(accessToken, operationId, recoverySecret) {
      return request<void>("/auth/account", {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: JSON.stringify({ confirmation: "DELETE", operationId, recoverySecret })
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

export function createUnavailableAuthApi(message: string): AuthApiClient {
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
