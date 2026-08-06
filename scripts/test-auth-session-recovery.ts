import assert from "node:assert/strict";
import { restoreAuthSession } from "../src/auth/sessionRecovery";
import type { AuthApiClient, AuthRefreshResult, AuthUser, TokenStorage } from "../src/auth/types";
import { AuthFlowError } from "../src/auth/utils/authErrors";

const user: AuthUser = { id: "owner-a", emailVerified: true, providers: ["email"] };
const refreshed: AuthRefreshResult = { accessToken: "access-next", refreshToken: "refresh-next", expiresAt: "2030-01-01T00:00:00.000Z" };

function createStorage(overrides: Partial<TokenStorage> = {}): TokenStorage {
  return {
    getRefreshToken: async () => "refresh-current",
    setRefreshToken: async () => undefined,
    removeRefreshToken: async () => undefined,
    getAccessToken: async () => "access-current",
    setAccessToken: async () => undefined,
    removeAccessToken: async () => undefined,
    clearAuthTokens: async () => undefined,
    ...overrides
  };
}

function createApi(overrides: Partial<AuthApiClient> = {}): AuthApiClient {
  return {
    getAuthProviders: async () => ({ email: true, yandex: false, vk: false }),
    startEmailLogin: async () => ({ ok: true, ttlSeconds: 600, resendAfterSeconds: 30 }),
    verifyEmailCode: async () => ({ ...refreshed, user }),
    refresh: async () => refreshed,
    logout: async () => undefined,
    deleteAccount: async () => undefined,
    getMe: async () => user,
    ...overrides
  };
}

const restore = (tokenStorage: TokenStorage, authApi = createApi()) =>
  restoreAuthSession({ authApi, tokenStorage, recoverPendingDeletion: async () => undefined });

async function main() {
  assert.equal((await restore(createStorage())).status, "authenticated");
  assert.equal((await restore(createStorage({ getRefreshToken: async () => null }))).status, "unauthenticated");

  for (const tokenStorage of [
    createStorage({ getRefreshToken: async () => Promise.reject(new Error("refresh read failed")) }),
    createStorage({ getAccessToken: async () => Promise.reject(new Error("access read failed")) }),
    createStorage({ setRefreshToken: async () => Promise.reject(new Error("refresh write failed")) }),
    createStorage({ setAccessToken: async () => Promise.reject(new Error("access write failed")) })
  ]) {
    const result = await restore(tokenStorage);
    assert.equal(result.status, "recoverable_error");
  }

  const corruptedResult = await restore(
    createStorage({ getRefreshToken: async () => "corrupted" }),
    createApi({ refresh: async () => Promise.reject(new AuthFlowError("invalid_refresh_token")) })
  );
  assert.equal(corruptedResult.status, "unauthenticated");

  const deleteFailureResult = await restore(
    createStorage({ clearAuthTokens: async () => Promise.reject(new Error("delete failed")) }),
    createApi({ refresh: async () => Promise.reject(new AuthFlowError("invalid_refresh_token")) })
  );
  assert.equal(deleteFailureResult.status, "recoverable_error");

  let storageAvailable = false;
  const resumableStorage = createStorage({
    getRefreshToken: async () => (storageAvailable ? "refresh-current" : Promise.reject(new Error("temporarily unavailable")))
  });
  assert.equal((await restore(resumableStorage)).status, "recoverable_error");
  storageAvailable = true;
  assert.equal((await restore(resumableStorage)).status, "authenticated", "Retry/app resume must leave the recovery state");

  console.log("Auth session recovery tests passed.");
}

void main();
