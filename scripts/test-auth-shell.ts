import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createAuthorizedFetch } from "../src/auth/api/apiClient";
import { AccountDeletionCleanupPendingError, deleteRemoteAccountWithRefresh, executeAccountDeletion } from "../src/auth/accountDeletion";
import { createHttpAuthApi, createMockAuthApi } from "../src/auth/api/authApi";
import { mergeProviderAvailability } from "../src/auth/config";
import { getAuthRouteDecision } from "../src/auth/routes";
import { createAuthErrorState, createUnauthenticatedState, initialAuthState } from "../src/auth/state";
import type { AuthSession, TokenStorage } from "../src/auth/types";
import { AuthFlowError, createAuthError } from "../src/auth/utils/authErrors";
import { isValidEmail, normalizeEmail } from "../src/auth/utils/email";
import { serializeDataState } from "../src/data/persistence/serializeSnapshot";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { NetworkTimeoutError } from "../src/utils/networkTimeout";

assert.equal(normalizeEmail("  Trainer@Example.COM "), "Trainer@example.com");
assert.equal(isValidEmail("name@example.com"), true);
assert.equal(isValidEmail("test-mail.ru"), false);
assert.equal(isValidEmail("name@test-mail.ru"), false);

assert.equal(getAuthRouteDecision(initialAuthState, "/"), "allow");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/clients/client-1"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/sign-in"), "allow");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/storybook"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/auth/callback"), "redirect_to_sign_in");
assert.equal(
  getAuthRouteDecision(createAuthErrorState(createAuthError("network_error"), initialAuthState), "/"),
  "redirect_to_connection_error"
);

const authenticatedSession: AuthSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: "2026-06-21T00:00:00.000Z",
  user: {
    id: "user-1",
    email: "trainer@example.com",
    emailVerified: true,
    displayName: "Тренер",
    avatarUrl: null,
    providers: ["email"]
  }
};

assert.equal(
  getAuthRouteDecision(
    {
      status: "authenticated",
      user: authenticatedSession.user,
      accessToken: authenticatedSession.accessToken,
      expiresAt: authenticatedSession.expiresAt,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      pendingEmail: null,
      providers: null
    },
    "/sign-in"
  ),
  "redirect_to_app"
);

const signInSource = readFileSync(new URL("../app/sign-in.tsx", import.meta.url), "utf8");
const settingsSource = readFileSync(new URL("../app/(tabs)/settings.tsx", import.meta.url), "utf8");
const rootLayoutSource = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
const authProviderSource = readFileSync(new URL("../src/auth/AuthProvider.tsx", import.meta.url), "utf8");
const accountDeletionSource = readFileSync(new URL("../src/auth/accountDeletion.ts", import.meta.url), "utf8");
const authApiSource = readFileSync(new URL("../src/auth/api/authApi.ts", import.meta.url), "utf8");
const authConfigSource = readFileSync(new URL("../src/auth/config.ts", import.meta.url), "utf8");
const authRoutesSource = readFileSync(new URL("../src/auth/routes.ts", import.meta.url), "utf8");
const authTypesSource = readFileSync(new URL("../src/auth/types.ts", import.meta.url), "utf8");
const dataProviderSource = readFileSync(new URL("../src/data/DataProvider.tsx", import.meta.url), "utf8");
const persistenceCoordinatorSource = readFileSync(new URL("../src/data/persistence/PersistenceCoordinator.ts", import.meta.url), "utf8");
const sessionTimerSource = readFileSync(new URL("../src/data/persistence/SessionTimerPersistence.ts", import.meta.url), "utf8");
const sessionResultQueueSource = readFileSync(new URL("../src/data/remote/sessionResultWriteQueue.ts", import.meta.url), "utf8");
const appConfig = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as { expo?: { scheme?: string } };

assert.match(signInSource, /Войти по почте/);
assert.match(signInSource, /\/auth\/email/);
assert.doesNotMatch(signInSource, /VK ID|Яндекс ID|startOAuthLogin|oauthCard|oauthButton/);
assert.equal(existsSync(new URL("../app/auth/callback.tsx", import.meta.url)), false);
assert.doesNotMatch(rootLayoutSource, /auth\/callback/);
assert.doesNotMatch(authProviderSource, /expo-linking|subscribeToAuthLinks|handleOAuthCallback|startOAuthLogin/);
assert.doesNotMatch(authApiSource, /\/auth\/oauth\/|\/auth\/ticket\/exchange|exchangeLoginTicket|startOAuthLogin/);
assert.doesNotMatch(authConfigSource, /EXPO_PUBLIC_(?:YANDEX|VK)_AUTH_ENABLED|appScheme/);
assert.doesNotMatch(authRoutesSource, /auth\/callback/);
assert.deepEqual(mergeProviderAvailability({ email: true, yandex: true, vk: true }), {
  email: true,
  yandex: false,
  vk: false
});
assert.equal(appConfig.expo?.scheme, "trainer");

assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/settings"), "redirect_to_sign_in");
assert.match(
  authProviderSource,
  /decision === "redirect_to_sign_in"[\s\S]*?router\.replace\(SIGN_IN_ROUTE\)/,
  "The auth boundary must replace a protected Settings route with sign-in after account deletion"
);

assert.match(settingsSource, /Удаление аккаунта/, "Settings must expose a dedicated account-deletion section");
assert.match(settingsSource, /Удалить аккаунт/, "Settings must expose an explicit account-deletion action");
assert.match(settingsSource, /const\s*\{[^}]*\bdeleteAccount\b[^}]*\}\s*=\s*useAuth\(\)/, "Settings must use the single AuthProvider deleteAccount entrypoint");
assert.equal((settingsSource.match(/\bdeleteAccount\s*\(/g) ?? []).length, 1, "Settings must invoke deleteAccount from exactly one confirmation handler");
assert.match(settingsSource, /title="Удалить аккаунт\?"/, "Account deletion must require a confirmation dialog");
assert.match(settingsSource, /actionLayout="stacked"/, "Account deletion confirmation actions must use the canonical stacked layout");
assert.match(settingsSource, /type:\s*"destructive"/, "The final account-deletion action must be visually destructive");
assert.match(settingsSource, /state:\s*\w+\s*\?\s*"loading"\s*:\s*"active"/, "The destructive action must expose a loading state");
assert.match(settingsSource, /disabled:\s*\w+/, "The cancel action must be disabled while deletion is running");
assert.match(settingsSource, /if\s*\(\s*\w+\s*\)\s*return/, "The confirmation handler must reject repeated presses");
assert.match(settingsSource, /catch\s*\([^)]*\)\s*\{[\s\S]*?set\w*Error\s*\(/, "A failed deletion must stay in Settings and expose a retryable error");
assert.match(settingsSource, /<Alert[\s\S]*?tone="negative"/, "Account deletion failures must use the canonical negative Alert");
assert.doesNotMatch(
  settingsSource,
  /SecureStore|AsyncStorage|clearAuthTokens|clearOwnerData|clearAccountData|router\.(?:replace|push|dismiss|dismissAll)/,
  "Settings must not orchestrate storage cleanup or navigation directly"
);

assert.match(authTypesSource, /deleteAccount\(accessToken:\s*string\):\s*Promise<void>/, "AuthApiClient must expose authenticated account deletion");
assert.match(authProviderSource, /deleteAccount:\s*\(\)\s*=>\s*Promise<void>/, "AuthContextValue must expose one deleteAccount operation");
assert.match(authProviderSource, /const\s+deleteAccount\s*=\s*useCallback/, "AuthProvider must own the account-deletion operation");
assert.match(authProviderSource, /executeAccountDeletion\(/, "AuthProvider must delegate deletion ordering to the tested orchestrator");
assert.match(authProviderSource, /registerAccountDeletionCleanup/, "AuthProvider must expose a lifecycle-cleanup registration seam");
assert.match(rootLayoutSource, /AccountDeletionLifecycleBridge/, "The authenticated app shell must mount an account-deletion lifecycle bridge");
assert.match(rootLayoutSource, /registerAccountDeletionCleanup/, "The lifecycle bridge must register owner-scoped cleanup with AuthProvider");
assert.match(rootLayoutSource, /<AccountDeletionLifecycleBridge\s*\/>/, "The lifecycle bridge must run inside the owner-scoped DataProvider");
assert.match(dataProviderSource, /clear(?:Owner|Account)Data/, "DataProvider must expose owner-scoped runtime and persistence cleanup to the lifecycle bridge");
assert.match(rootLayoutSource, /<DataProvider[\s\S]*?key=\{currentOwnerId\}/, "DataProvider must remount when the authenticated owner changes");
assert.match(dataProviderSource, /remoteState\s*&&\s*!isCancelled\(\)\s*&&\s*!isBlocked\(\)/, "A late bootstrap must not restore deleted-owner state");
const clearAccountDataSource = extractBraceBlock(dataProviderSource, "const clearAccountData = useCallback");
assert.doesNotMatch(clearAccountDataSource, /saveImmediately\(/, "Deleted owner state must not be re-saved after cleanup");
assert.match(clearAccountDataSource, /createProductionState\(\)/, "Runtime cleanup must retain only the canonical production seed");
assert.match(persistenceCoordinatorSource, /closeAndClear[\s\S]*?await this\.writeChain[\s\S]*?await this\.adapter\.clear\(\)/, "Persistence cleanup must drain writes before clearing the owner key");
assert.match(sessionTimerSource, /trainer-app:\$\{ownerId\}:session-timer:v2:/, "Session timers must be owner-scoped");
assert.match(sessionTimerSource, /closeAndClearOwner/, "Account deletion must clear owner-scoped and known legacy timers");
assert.match(sessionResultQueueSource, /pauseAndDrain/, "Account deletion must pause and drain result writes");
const logoutSource = extractBraceBlock(authProviderSource, "const logout = useCallback");
assert.doesNotMatch(logoutSource, /clearAccountData|accountDeletionCleanup/, "Normal logout must preserve the owner cache");

const httpDeleteAccountSource = extractBraceBlock(authApiSource, "deleteAccount(accessToken)");
assert.match(httpDeleteAccountSource, /request<void>\(\s*"\/auth\/account"/, "Account deletion must target DELETE /auth/account");
assert.match(httpDeleteAccountSource, /method:\s*"DELETE"/, "Account deletion must use HTTP DELETE");
assert.match(httpDeleteAccountSource, /Authorization:\s*`Bearer \$\{accessToken\}`/, "Account deletion must send the current access token");
assert.match(httpDeleteAccountSource, /confirmation:\s*"DELETE"/, "Account deletion must send the explicit DELETE confirmation marker");
assert.ok((authApiSource.match(/\bdeleteAccount\b/g) ?? []).length >= 3, "HTTP, unavailable, and mock auth APIs must all implement deleteAccount");

const accountDeletionOperationSource = extractBraceBlock(accountDeletionSource, "export async function executeAccountDeletion");
assert.doesNotMatch(accountDeletionOperationSource, /createAuthErrorState/, "A deletion failure must preserve the authenticated state for retry");
assert.doesNotMatch(
  accountDeletionOperationSource,
  /finally\s*\{[^}]*(?:clearAuthSession|clearAuthTokens|AccountDeletionCleanup)/,
  "Failure cleanup must not clear credentials or owner data from a finally block"
);
assertSourceOrder(accountDeletionOperationSource, [
  { pattern: /deleteRemoteAccount\(/, label: "confirmed server deletion" },
  { pattern: /registeredCleanup\.commit\(/, label: "owner-scoped lifecycle cleanup" },
  { pattern: /clearAuthSession\(/, label: "credential clearing and unauthenticated transition" }
]);
assert.match(accountDeletionOperationSource, /throw new AuthFlowError\("session_expired"\)/, "deleteAccount must fail closed when no authenticated access token exists");

async function main() {
  const tokenStorage = createTestTokenStorage();
  await tokenStorage.setRefreshToken("refresh-token");
  await tokenStorage.setAccessToken("access-token");
  assert.equal(await tokenStorage.getRefreshToken(), "refresh-token");
  assert.equal(await tokenStorage.getAccessToken(), "access-token");
  await tokenStorage.clearAuthTokens();
  assert.equal(await tokenStorage.getRefreshToken(), null);
  assert.equal(await tokenStorage.getAccessToken(), null);

  const authApi = createMockAuthApi();
  await authApi.startEmailLogin("trainer@example.com");
  const session = await authApi.verifyEmailCode("trainer@example.com", "111111");
  assert.equal(session.user.email, "trainer@example.com");
  assert.equal(session.user.providers[0], "email");
  const refreshed = await authApi.refresh(session.refreshToken);
  assert.match(refreshed.accessToken, /^mock-access:/);
  const me = await authApi.getMe(refreshed.accessToken);
  assert.equal(me.email, "trainer@example.com");
  await authApi.logout(refreshed.refreshToken);

  const deletedMockSession = await authApi.verifyEmailCode("recreate@example.com", "111111");
  await authApi.deleteAccount(deletedMockSession.accessToken);
  const recreatedMockSession = await authApi.verifyEmailCode("recreate@example.com", "111111");
  assert.notEqual(recreatedMockSession.user.id, deletedMockSession.user.id, "mock re-registration must create a clean account identity");
  assert.equal((await authApi.getMe(recreatedMockSession.accessToken)).id, recreatedMockSession.user.id);

  let deleteRequest: { url: string; init?: RequestInit } | undefined;
  const deletionHttpApi = createHttpAuthApi({
    baseUrl: "https://example.com",
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      deleteRequest = { url: String(input), init };
      return new Response(null, { status: 204 });
    }) as typeof fetch
  });
  await deletionHttpApi.deleteAccount("account-access-token");
  assert.equal(deleteRequest?.url, "https://example.com/auth/account");
  assert.equal(deleteRequest?.init?.method, "DELETE");
  assert.equal((deleteRequest?.init?.headers as Record<string, string>).Authorization, "Bearer account-access-token");
  assert.deepEqual(JSON.parse(String(deleteRequest?.init?.body)), { confirmation: "DELETE" });

  const failedDeletionEvents: string[] = [];
  let credentialsCleared = false;
  await assert.rejects(
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: {
        ownerId: "owner-1",
        async prepare() {
          failedDeletionEvents.push("prepare");
        },
        async commit() {
          failedDeletionEvents.push("commit");
        },
        async rollback() {
          failedDeletionEvents.push("rollback");
        }
      },
      async pauseAndDrain() {
        failedDeletionEvents.push("pause");
      },
      resume() {
        failedDeletionEvents.push("resume");
      },
      async deleteRemoteAccount() {
        failedDeletionEvents.push("remote");
        throw new AuthFlowError("network_error");
      },
      async clearAuthSession() {
        credentialsCleared = true;
      }
    }),
    (error: unknown) => error instanceof AuthFlowError && error.code === "network_error"
  );
  assert.deepEqual(failedDeletionEvents, ["pause", "prepare", "remote", "rollback", "resume"]);
  assert.equal(credentialsCleared, false, "remote failure must preserve auth credentials");

  const successfulDeletionEvents: string[] = [];
  await executeAccountDeletion({
    accessToken: "access",
    ownerId: "owner-1",
    registeredCleanup: {
      ownerId: "owner-1",
      async prepare() {
        successfulDeletionEvents.push("prepare");
      },
      async commit() {
        successfulDeletionEvents.push("commit");
      },
      async rollback() {
        successfulDeletionEvents.push("rollback");
      }
    },
    async pauseAndDrain() {
      successfulDeletionEvents.push("pause");
    },
    resume() {
      successfulDeletionEvents.push("resume");
    },
    async deleteRemoteAccount() {
      successfulDeletionEvents.push("remote");
    },
    async clearAuthSession() {
      successfulDeletionEvents.push("clear-auth");
    }
  });
  assert.deepEqual(successfulDeletionEvents, ["pause", "prepare", "remote", "commit", "clear-auth", "resume"]);

  const retryableCleanupEvents: string[] = [];
  let remoteDeletionConfirmed = false;
  let cleanupAttempts = 0;
  const retryableCleanup = {
    ownerId: "owner-1",
    async prepare() {
      retryableCleanupEvents.push("prepare");
    },
    async commit() {
      cleanupAttempts += 1;
      retryableCleanupEvents.push(`commit-${cleanupAttempts}`);
      if (cleanupAttempts === 1) throw new Error("transient AsyncStorage failure");
    },
    async rollback() {
      retryableCleanupEvents.push("rollback");
    }
  };
  const deletionAttempt = () =>
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: retryableCleanup,
      remoteDeletionConfirmed,
      async pauseAndDrain() {
        retryableCleanupEvents.push("pause");
      },
      resume() {
        retryableCleanupEvents.push("resume");
      },
      async deleteRemoteAccount() {
        retryableCleanupEvents.push("remote");
      },
      async clearAuthSession() {
        retryableCleanupEvents.push("clear-auth");
      },
      markRemoteDeletionConfirmed() {
        remoteDeletionConfirmed = true;
      },
      markDeletionComplete() {
        remoteDeletionConfirmed = false;
      }
    });
  await assert.rejects(deletionAttempt(), (error: unknown) => error instanceof AccountDeletionCleanupPendingError);
  assert.equal(remoteDeletionConfirmed, true, "a confirmed remote deletion must remain recorded for local-cleanup retry");
  assert.deepEqual(retryableCleanupEvents, ["pause", "prepare", "remote", "commit-1"]);
  await deletionAttempt();
  assert.deepEqual(retryableCleanupEvents, ["pause", "prepare", "remote", "commit-1", "commit-2", "clear-auth", "resume"]);
  assert.equal(remoteDeletionConfirmed, false);

  const credentialRetryEvents: string[] = [];
  let credentialClearAttempts = 0;
  const credentialRetryAttempt = () =>
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: {
        ownerId: "owner-1",
        async prepare() {
          throw new Error("remote deletion is already confirmed");
        },
        async commit() {
          credentialRetryEvents.push("commit");
        },
        async rollback() {
          credentialRetryEvents.push("rollback");
        }
      },
      remoteDeletionConfirmed: true,
      async pauseAndDrain() {
        credentialRetryEvents.push("pause");
      },
      resume() {
        credentialRetryEvents.push("resume");
      },
      async deleteRemoteAccount() {
        credentialRetryEvents.push("unexpected-remote");
      },
      async clearAuthSession() {
        credentialClearAttempts += 1;
        credentialRetryEvents.push(`clear-auth-${credentialClearAttempts}`);
        if (credentialClearAttempts === 1) throw new Error("transient SecureStore failure");
      }
    });
  await assert.rejects(credentialRetryAttempt(), (error: unknown) => error instanceof AccountDeletionCleanupPendingError);
  await credentialRetryAttempt();
  assert.deepEqual(credentialRetryEvents, ["commit", "clear-auth-1", "commit", "clear-auth-2", "resume"]);

  const refreshedDeletionEvents: string[] = [];
  await deleteRemoteAccountWithRefresh({
    accessToken: "expired-access",
    async deleteRemoteAccount(accessToken) {
      refreshedDeletionEvents.push(`delete:${accessToken}`);
      if (accessToken === "expired-access") throw new AuthFlowError("session_expired");
    },
    async getRefreshToken() {
      refreshedDeletionEvents.push("get-refresh");
      return "valid-refresh";
    },
    async refreshSession(refreshToken) {
      refreshedDeletionEvents.push(`refresh:${refreshToken}`);
      return { accessToken: "fresh-access", refreshToken: "rotated-refresh", expiresAt: "2026-07-20T00:00:00.000Z" };
    },
    async persistRefreshedSession(session) {
      refreshedDeletionEvents.push(`persist:${session.refreshToken}`);
    }
  });
  assert.deepEqual(refreshedDeletionEvents, [
    "delete:expired-access",
    "get-refresh",
    "refresh:valid-refresh",
    "persist:rotated-refresh",
    "delete:fresh-access"
  ]);

  let refreshCalls = 0;
  const fetchCalls: string[] = [];
  const retryFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push(String((init?.headers as Record<string, string> | undefined)?.Authorization ?? ""));
    return new Response(null, { status: fetchCalls.length === 1 ? 401 : 200 });
  }) as typeof fetch;

  const retryStorage = createTestTokenStorage({ refreshToken: session.refreshToken, accessToken: session.accessToken });
  const authorizedFetch = createAuthorizedFetch({
    authApi: {
      ...authApi,
      async refresh(refreshToken) {
        refreshCalls += 1;
        return authApi.refresh(refreshToken);
      }
    },
    tokenStorage: retryStorage,
    getAccessToken: () => session.accessToken,
    setAccessToken: () => undefined,
    onSessionExpired: () => undefined,
    fetchImpl: retryFetch
  });

  const retryResponse = await authorizedFetch("https://example.com/protected");
  assert.equal(retryResponse.status, 200);
  assert.equal(refreshCalls, 1);
  assert.equal(fetchCalls.length, 2);

  const neverResolvingFetch = (() => new Promise<Response>(() => undefined)) as typeof fetch;
  const timeoutApi = createHttpAuthApi({
    baseUrl: "https://example.com",
    timeoutMs: 15,
    fetchImpl: neverResolvingFetch
  });
  await assert.rejects(withWatchdog(timeoutApi.getAuthProviders()), (error: unknown) => {
    return error instanceof AuthFlowError && error.code === "network_error" && error.cause instanceof NetworkTimeoutError;
  });

  let sessionExpiredCalls = 0;
  const unauthorizedFetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
  const networkRefreshFetch = createAuthorizedFetch({
    authApi: {
      ...authApi,
      async refresh() {
        throw new AuthFlowError("network_error");
      }
    },
    tokenStorage: retryStorage,
    getAccessToken: () => session.accessToken,
    setAccessToken: () => undefined,
    onSessionExpired: () => {
      sessionExpiredCalls += 1;
    },
    fetchImpl: unauthorizedFetch
  });
  await assert.rejects(networkRefreshFetch("https://example.com/protected"), (error: unknown) => {
    return error instanceof AuthFlowError && error.code === "network_error";
  });
  assert.equal(sessionExpiredCalls, 0);

  const terminalRefreshFetch = createAuthorizedFetch({
    authApi: {
      ...authApi,
      async refresh() {
        throw new AuthFlowError("session_expired");
      }
    },
    tokenStorage: retryStorage,
    getAccessToken: () => session.accessToken,
    setAccessToken: () => undefined,
    onSessionExpired: () => {
      sessionExpiredCalls += 1;
    },
    fetchImpl: unauthorizedFetch
  });
  await assert.rejects(terminalRefreshFetch("https://example.com/protected"), (error: unknown) => {
    return error instanceof AuthFlowError && error.code === "session_expired";
  });
  assert.equal(sessionExpiredCalls, 1);

  const snapshotJson = JSON.stringify(serializeDataState(createInitialState()));
  assert.equal(snapshotJson.includes("mock-access"), false);
  assert.equal(snapshotJson.includes("refreshToken"), false);
  assert.equal(snapshotJson.includes("accessToken"), false);

  console.log("Auth-first contract tests passed");
}

void main();

function withWatchdog<T>(promise: Promise<T>, timeoutMs = 250): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const watchdog = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Network timeout regression test did not settle")), timeoutMs);
  });
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timeoutId));
}

function createTestTokenStorage(initialTokens: { refreshToken?: string | null; accessToken?: string | null } = {}): TokenStorage {
  let refreshToken = initialTokens.refreshToken ?? null;
  let accessToken = initialTokens.accessToken ?? null;

  return {
    async getRefreshToken() {
      return refreshToken;
    },
    async setRefreshToken(token) {
      refreshToken = token;
    },
    async removeRefreshToken() {
      refreshToken = null;
    },
    async getAccessToken() {
      return accessToken;
    },
    async setAccessToken(token) {
      accessToken = token;
    },
    async removeAccessToken() {
      accessToken = null;
    },
    async clearAuthTokens() {
      refreshToken = null;
      accessToken = null;
    }
  };
}

function extractBraceBlock(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  assert.ok(markerIndex >= 0, `Missing source-contract marker: ${marker}`);
  const openingBraceIndex = source.indexOf("{", markerIndex);
  assert.ok(openingBraceIndex >= 0, `Missing opening brace after source-contract marker: ${marker}`);

  let depth = 0;
  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(markerIndex, index + 1);
  }

  assert.fail(`Missing closing brace after source-contract marker: ${marker}`);
}

function assertSourceOrder(source: string, steps: Array<{ pattern: RegExp; label: string }>) {
  let previousIndex = -1;
  for (const step of steps) {
    const match = step.pattern.exec(source);
    assert.ok(match?.index !== undefined, `Missing account-deletion step: ${step.label}`);
    assert.ok(match.index > previousIndex, `Account-deletion step is out of order: ${step.label}`);
    previousIndex = match.index;
  }
}
