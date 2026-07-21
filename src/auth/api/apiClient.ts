import type { AuthApiClient, TokenStorage } from "../types";
import { AuthFlowError } from "../utils/authErrors";

type AuthorizedFetchInput = {
  authApi: AuthApiClient;
  tokenStorage: TokenStorage;
  getAccessToken: () => string | null;
  setAccessToken: (token: string, expiresAt: string) => void;
  onSessionExpired: () => Promise<void> | void;
  fetchImpl?: typeof fetch;
};

export function createAuthorizedFetch({ authApi, tokenStorage, getAccessToken, setAccessToken, onSessionExpired, fetchImpl = globalThis.fetch }: AuthorizedFetchInput) {
  let refreshPromise: Promise<string> | null = null;

  async function refreshOnce() {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new AuthFlowError("session_expired");
        }
        const refreshed = await authApi.refresh(refreshToken);
        await tokenStorage.setRefreshToken(refreshed.refreshToken);
        await tokenStorage.setAccessToken(refreshed.accessToken);
        setAccessToken(refreshed.accessToken, refreshed.expiresAt);
        return refreshed.accessToken;
      })().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  return async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const accessToken = getAccessToken();
    const firstResponse = await fetchWithToken(fetchImpl, input, init, accessToken);
    if (firstResponse.status !== 401) return firstResponse;

    try {
      const refreshedAccessToken = await refreshOnce();
      return fetchWithToken(fetchImpl, input, init, refreshedAccessToken);
    } catch (error) {
      if (error instanceof AuthFlowError && (error.code === "session_expired" || error.code === "invalid_refresh_token")) {
        await onSessionExpired();
      }
      throw error;
    }
  };
}

function fetchWithToken(fetchImpl: typeof fetch, input: RequestInfo | URL, init: RequestInit, accessToken: string | null) {
  return fetchImpl(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    }
  });
}
