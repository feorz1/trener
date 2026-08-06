import type { AuthApiClient, AuthError, AuthUser, TokenStorage } from "./types";
import { normalizeAuthError } from "./utils/authErrors";

export type AuthSessionRecoveryResult =
  | { status: "authenticated"; accessToken: string; expiresAt: string; user: AuthUser }
  | { status: "unauthenticated"; error?: AuthError }
  | { status: "recoverable_error"; error: AuthError };

type RestoreAuthSessionInput = {
  authApi: Pick<AuthApiClient, "refresh" | "getMe">;
  tokenStorage: TokenStorage;
  recoverPendingDeletion: () => Promise<void>;
};

function isTerminalSessionError(error: AuthError) {
  return error.code === "session_expired" || error.code === "invalid_refresh_token";
}

async function clearTerminalSession(tokenStorage: TokenStorage, error: AuthError): Promise<AuthSessionRecoveryResult> {
  try {
    await tokenStorage.clearAuthTokens();
    return { status: "unauthenticated", error };
  } catch (storageError) {
    return { status: "recoverable_error", error: normalizeAuthError(storageError, "server_error") };
  }
}

export async function restoreAuthSession({
  authApi,
  tokenStorage,
  recoverPendingDeletion
}: RestoreAuthSessionInput): Promise<AuthSessionRecoveryResult> {
  try {
    await recoverPendingDeletion();

    const [refreshToken] = await Promise.all([tokenStorage.getRefreshToken(), tokenStorage.getAccessToken()]);
    if (!refreshToken) return { status: "unauthenticated" };

    let refreshed;
    try {
      refreshed = await authApi.refresh(refreshToken);
    } catch (error) {
      const authError = normalizeAuthError(error);
      return isTerminalSessionError(authError)
        ? clearTerminalSession(tokenStorage, authError)
        : { status: "recoverable_error", error: authError };
    }

    try {
      await Promise.all([tokenStorage.setRefreshToken(refreshed.refreshToken), tokenStorage.setAccessToken(refreshed.accessToken)]);
      const user = await authApi.getMe(refreshed.accessToken);
      return { status: "authenticated", accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt, user };
    } catch (error) {
      const authError = normalizeAuthError(error, "server_error");
      return isTerminalSessionError(authError)
        ? clearTerminalSession(tokenStorage, authError)
        : { status: "recoverable_error", error: authError };
    }
  } catch (error) {
    return { status: "recoverable_error", error: normalizeAuthError(error, "server_error") };
  }
}
