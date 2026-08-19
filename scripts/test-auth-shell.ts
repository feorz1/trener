import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createAuthorizedFetch } from "../src/auth/api/apiClient";
import { AccountDeletionCleanupPendingError, deleteRemoteAccountWithRefresh, executeAccountDeletion, reconcilePendingAccountDeletion } from "../src/auth/accountDeletion";
import { createAccountDeletionRecoveryMaterial } from "../src/auth/accountDeletionRecoveryMaterial";
import { createHttpAuthApi, createMockAuthApi } from "../src/auth/api/authApi";
import { createAccountDeletionSecretStorage, type AccountDeletionRecoveryProof } from "../src/auth/services/accountDeletionSecretStorage";
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
const appearanceSheetSource = readFileSync(new URL("../app/settings/appearance.tsx", import.meta.url), "utf8");
const logoutSheetSource = readFileSync(new URL("../app/settings/logout.tsx", import.meta.url), "utf8");
const deleteAccountSheetSource = readFileSync(new URL("../app/settings/delete-account.tsx", import.meta.url), "utf8");
const modalSource = readFileSync(new URL("../src/components/ui/Modal.tsx", import.meta.url), "utf8");
const rootLayoutSource = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
const authProviderSource = readFileSync(new URL("../src/auth/AuthProvider.tsx", import.meta.url), "utf8");
const accountDeletionSource = readFileSync(new URL("../src/auth/accountDeletion.ts", import.meta.url), "utf8");
const authApiSource = readFileSync(new URL("../src/auth/api/authApi.ts", import.meta.url), "utf8");
const httpAuthApiSource = readFileSync(new URL("../src/auth/api/httpAuthApi.ts", import.meta.url), "utf8");
const authConfigSource = readFileSync(new URL("../src/auth/config.ts", import.meta.url), "utf8");
const authRoutesSource = readFileSync(new URL("../src/auth/routes.ts", import.meta.url), "utf8");
const authTypesSource = readFileSync(new URL("../src/auth/types.ts", import.meta.url), "utf8");
const nativeDeletionSecretStorageSource = readFileSync(new URL("../src/auth/services/nativeAccountDeletionSecretStorage.ts", import.meta.url), "utf8");
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
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/settings/appearance"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/settings/logout"), "redirect_to_sign_in");
assert.equal(getAuthRouteDecision(createUnauthenticatedState(), "/settings/delete-account"), "redirect_to_sign_in");
assert.match(
  authProviderSource,
  /decision === "redirect_to_sign_in"[\s\S]*?router\.replace\(SIGN_IN_ROUTE\)/,
  "The auth boundary must replace a protected Settings route with sign-in after account deletion"
);

assert.match(
  settingsSource,
  /<Header title="Профиль"[\s\S]*?title=\{profileEmail\}[\s\S]*?groupPosition="first"[\s\S]*?title="Данные аккаунта"[\s\S]*?groupPosition="last"/,
  "Settings must expose account data as the second row inside the profile group"
);
assert.doesNotMatch(settingsSource, /<Header title="Удаление аккаунта"/, "Settings must not isolate account deletion in a separate section");
assert.match(settingsSource, /Удалить аккаунт/, "Settings must expose an explicit account-deletion action");
assert.match(settingsSource, /router\.push\("\/settings\/appearance"\)/, "Settings must open appearance selection in a routed native sheet");
assert.match(settingsSource, /router\.push\("\/settings\/logout"\)/, "Settings must open logout in a routed native sheet");
assert.match(settingsSource, /router\.push\("\/settings\/delete-account"\)/, "Settings must open account deletion in a routed native sheet");
assert.doesNotMatch(settingsSource, /logoutVisible|deleteAccountVisible|\bdeleteAccount\b/, "Settings must not own routed confirmation state or deletion orchestration");
assert.doesNotMatch(settingsSource, /appearanceVisible|presentation="overlay"|\bsetPreference\b/, "Settings must not own the routed appearance sheet or theme-selection behavior");
assert.match(
  rootLayoutSource,
  /name="settings\/appearance"[\s\S]*?presentation: "formSheet"[\s\S]*?sheetAllowedDetents: "fitToContents"/,
  "Appearance selection must use the native fit-to-content form sheet"
);
assert.match(
  rootLayoutSource,
  /name="settings\/logout"[\s\S]*?presentation: "formSheet"[\s\S]*?sheetAllowedDetents: "fitToContents"/,
  "Logout confirmation must use the native fit-to-content form sheet"
);
assert.match(
  rootLayoutSource,
  /name="settings\/delete-account"[\s\S]*?presentation: "formSheet"[\s\S]*?sheetAllowedDetents: "fitToContents"/,
  "Account deletion must use a native fit-to-content form sheet"
);
assert.doesNotMatch(
  rootLayoutSource,
  /name="settings\/delete-account"[\s\S]*?gestureEnabled: false/,
  "Account deletion must allow native background-tap dismissal before deletion starts"
);
assert.doesNotMatch(
  rootLayoutSource,
  /sheetCornerRadius:/,
  "Native form sheets must defer their corner radius to iOS so bottom corners follow the device geometry"
);
assert.match(appearanceSheetSource, /<Modal[\s\S]*?presentation="inline"[\s\S]*?showActions=\{false\}/, "Appearance content must render inside the routed native sheet");
assert.match(appearanceSheetSource, /accessibilityRole="radiogroup"/, "Appearance options must expose a single accessible radio group");
assert.match(appearanceSheetSource, /accessibilityRole="radio"[\s\S]*?accessibilityState=\{\{ checked:/, "Each appearance option must expose its checked radio state");
assert.match(appearanceSheetSource, /router\.back\(\);[\s\S]*?void setPreference\(nextPreference\);/, "Theme selection must dismiss the native sheet before applying the preference");
assert.doesNotMatch(
  logoutSheetSource,
  /Вы выйдете из аккаунта на этом устройстве/,
  "The logout confirmation must stay compact without explanatory copy"
);
assert.match(
  logoutSheetSource,
  /<Modal[\s\S]*?presentation="inline"[\s\S]*?showBodyText=\{false\}[\s\S]*?primaryAction=/,
  "The logout confirmation must disable ModalBody fallback copy"
);
assert.match(logoutSheetSource, /router\.back\(\);[\s\S]*?void logout\(\);/, "Logout must dismiss its native sheet before clearing the session");
assert.match(
  modalSource,
  /const hasBodyContent = hasBodyText \|\| Children\.toArray\(children\)\.length > 0;[\s\S]*?if \(!hasBodyContent\) return null;/,
  "ModalBody must collapse completely when both body text and slotted content are absent"
);
assert.match(deleteAccountSheetSource, /presentation="inline"/, "The account-deletion content must render inside the routed native sheet");
assert.match(deleteAccountSheetSource, /const\s*\{[^}]*\bdeleteAccount\b[^}]*\}\s*=\s*useAuth\(\)/, "The deletion sheet must use the single AuthProvider deleteAccount entrypoint");
assert.equal((deleteAccountSheetSource.match(/\bdeleteAccount\s*\(/g) ?? []).length, 1, "The deletion sheet must invoke deleteAccount from exactly one confirmation handler");
assert.match(deleteAccountSheetSource, /title="Удалить аккаунт\?"/, "Account deletion must require a confirmation dialog");
assert.match(deleteAccountSheetSource, /actionLayout="stacked"/, "Account deletion confirmation actions must use the canonical stacked layout");
assert.match(deleteAccountSheetSource, /type:\s*"destructive"/, "The final account-deletion action must be visually destructive");
assert.match(deleteAccountSheetSource, /state:\s*\w+\s*\?\s*"loading"\s*:\s*"active"/, "The destructive action must expose a loading state");
assert.match(deleteAccountSheetSource, /disabled:\s*\w+/, "The cancel action must be disabled while deletion is running");
assert.match(deleteAccountSheetSource, /if\s*\(\s*\w+\s*\)\s*return/, "The confirmation handler must reject repeated presses");
assert.match(
  deleteAccountSheetSource,
  /navigation\.setOptions\(\{ gestureEnabled: !dismissBlocked \}\)/,
  "Account deletion must disable only native dismissal gestures while deletion or mandatory cleanup is active"
);
assert.doesNotMatch(deleteAccountSheetSource, /usePreventRemove/, "Account deletion must not block the successful auth redirect after deletion");
assert.match(deleteAccountSheetSource, /catch\s*\([^)]*\)\s*\{[\s\S]*?set\w*Error\s*\(/, "A failed deletion must stay in the native sheet and expose a retryable error");
assert.match(deleteAccountSheetSource, /<Alert[\s\S]*?tone="negative"/, "Account deletion failures must use the canonical negative Alert");
assert.doesNotMatch(
  deleteAccountSheetSource,
  /SecureStore|AsyncStorage|clearAuthTokens|clearOwnerData|clearAccountData|router\.(?:replace|push|dismiss|dismissAll)/,
  "The deletion sheet must not orchestrate storage cleanup or success navigation directly"
);

assert.match(authTypesSource, /deleteAccount\(accessToken:\s*string \| null, operationId:\s*string, recoverySecret:\s*string\):\s*Promise<void>/, "AuthApiClient must expose proof-bound account deletion reconciliation");
assert.match(nativeDeletionSecretStorageSource, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/, "The recovery proof must stay in a non-migrating device-only Keychain item");
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
const prepareAccountDeletionSource = extractBraceBlock(dataProviderSource, "const prepareAccountDeletion = useCallback");
assert.match(prepareAccountDeletionSource, /=== "prepared"[\s\S]*?=== "committing"[\s\S]*?=== "committed"[\s\S]*?return;/, "Account deletion prepare must be idempotent across retryable cleanup phases");
const clearAccountDataSource = extractBraceBlock(dataProviderSource, "const clearAccountData = useCallback");
assert.doesNotMatch(clearAccountDataSource, /saveImmediately\(/, "Deleted owner state must not be re-saved after cleanup");
assert.match(clearAccountDataSource, /createProductionState\(\)/, "Runtime cleanup must retain only the canonical production seed");
assert.match(persistenceCoordinatorSource, /closeAndClear[\s\S]*?await this\.writeChain[\s\S]*?await this\.adapter\.clear\(\)/, "Persistence cleanup must drain writes before clearing the owner key");
assert.match(sessionTimerSource, /trainer-app:\$\{ownerId\}:session-timer:v2:/, "Session timers must be owner-scoped");
assert.match(sessionTimerSource, /closeAndClearOwner/, "Account deletion must clear owner-scoped and known legacy timers");
assert.match(sessionResultQueueSource, /pauseAndDrain/, "Account deletion must pause and drain result writes");
const logoutSource = extractBraceBlock(authProviderSource, "const logout = useCallback");
assert.doesNotMatch(logoutSource, /clearAccountData|accountDeletionCleanup/, "Normal logout must preserve the owner cache");
const setAuthSessionSource = extractBraceBlock(authProviderSource, "const setAuthSession = useCallback");
assert.match(setAuthSessionSource, /hasPendingAccountDeletion\(\)/, "A pending deletion marker must block writing a new auth session");
const resetAuthStorageSource = extractBraceBlock(authProviderSource, "const resetAuthStorage = useCallback");
assert.match(resetAuthStorageSource, /hasPendingAccountDeletion\(\)/, "Generic auth reset must not discard credentials needed for deletion reconciliation");
const startupDeletionRecoverySource = extractBraceBlock(authProviderSource, "recoverPendingDeletion: async () =>");
assert.match(startupDeletionRecoverySource, /recoverPendingAccountDeletion\(/, "Startup must invoke the legacy-aware deletion recovery path unconditionally");
assert.doesNotMatch(startupDeletionRecoverySource, /readPendingAccountDeletion\(/, "Startup must not collapse a legacy deletion marker into the absent-marker path");
assert.match(startupDeletionRecoverySource, /reconcilePendingAccountDeletion\(/, "Startup must use owner-bound remote deletion reconciliation");

const httpDeleteAccountSource = extractBraceBlock(httpAuthApiSource, "deleteAccount(accessToken, operationId, recoverySecret)");
assert.match(httpDeleteAccountSource, /request<void>\(\s*"\/auth\/account"/, "Account deletion must target DELETE /auth/account");
assert.match(httpDeleteAccountSource, /method:\s*"DELETE"/, "Account deletion must use HTTP DELETE");
assert.match(httpDeleteAccountSource, /Authorization:\s*`Bearer \$\{accessToken\}`/, "Account deletion must send the current access token");
assert.match(httpDeleteAccountSource, /confirmation:\s*"DELETE"/, "Account deletion must send the explicit DELETE confirmation marker");
assert.match(httpDeleteAccountSource, /operationId/, "Account deletion must send its durable client-generated operation ID");
assert.match(httpDeleteAccountSource, /recoverySecret/, "Account deletion must send the recovery proof");
assert.ok(
  ((authApiSource.match(/\bdeleteAccount\b/g) ?? []).length + (httpAuthApiSource.match(/\bdeleteAccount\b/g) ?? []).length) >= 3,
  "HTTP, unavailable, and mock auth APIs must all implement deleteAccount"
);

const accountDeletionOperationSource = extractBraceBlock(accountDeletionSource, "export async function executeAccountDeletion");
assert.doesNotMatch(accountDeletionOperationSource, /createAuthErrorState/, "A deletion failure must preserve the authenticated state for retry");
assert.doesNotMatch(
  accountDeletionOperationSource,
  /finally\s*\{[^}]*(?:clearAuthSession|clearAuthTokens|AccountDeletionCleanup)/,
  "Failure cleanup must not clear credentials or owner data from a finally block"
);
assertSourceOrder(accountDeletionOperationSource, [
  { pattern: /persistDeletionRecovery\(/, label: "durable deletion intent and proof" },
  { pattern: /deleteRemoteAccount\(/, label: "confirmed server deletion" },
  { pattern: /registeredCleanup\.commit\(/, label: "owner-scoped lifecycle cleanup" },
  { pattern: /clearAuthSession\(/, label: "credential clearing and unauthenticated transition" }
]);
assert.match(accountDeletionOperationSource, /throw new AuthFlowError\("session_expired"\)/, "deleteAccount must fail closed when no authenticated access token exists");

function deletionCleanup(events: string[]) {
  return {
    ownerId: "owner-1",
    async prepare() { events.push("prepare"); },
    async commit() { events.push("commit"); },
    async rollback() { events.push("rollback"); }
  };
}

const TEST_OPERATION_ID = "11111111-1111-4111-8111-111111111111";
const TEST_RECOVERY_SECRET = "A".repeat(43);

type TestRecoveryState = {
  current: { pending: { version: 3; operationId: string; state: "requested" | "server_confirmed" | "local_cleanup" | "completed" }; proof: AccountDeletionRecoveryProof } | null;
};

function recoveryCallbacks(events: string[], recoveryState: TestRecoveryState) {
  return {
    async loadDeletionRecovery() { return recoveryState.current; },
    async createDeletionRecovery(ownerId: string) {
      events.push("create-recovery");
      return { version: 1 as const, ownerId, operationId: TEST_OPERATION_ID, recoverySecret: TEST_RECOVERY_SECRET };
    },
    async persistDeletionRecovery(proof: AccountDeletionRecoveryProof) {
      events.push("persist-recovery");
      const pending = { version: 3 as const, operationId: proof.operationId, state: "requested" as const };
      recoveryState.current = { pending, proof };
      return pending;
    },
    async discardDeletionRecovery() {
      events.push("discard-recovery");
      recoveryState.current = null;
    },
    async markDeletionState(operationId: string, state: "requested" | "server_confirmed" | "local_cleanup" | "completed") {
      events.push(`state:${state}`);
      if (recoveryState.current) recoveryState.current.pending = { version: 3, operationId, state };
    }
  };
}

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
  await authApi.deleteAccount(deletedMockSession.accessToken, TEST_OPERATION_ID, TEST_RECOVERY_SECRET);
  await authApi.deleteAccount(null, TEST_OPERATION_ID, TEST_RECOVERY_SECRET);
  await assert.rejects(authApi.deleteAccount(null, TEST_OPERATION_ID, "B".repeat(43)), (error: unknown) => error instanceof AuthFlowError);
  const recreatedMockSession = await authApi.verifyEmailCode("recreate@example.com", "111111");
  assert.notEqual(recreatedMockSession.user.id, deletedMockSession.user.id, "mock re-registration must create a clean account identity");
  assert.equal((await authApi.getMe(recreatedMockSession.accessToken)).id, recreatedMockSession.user.id);

  const deletionRequests: Array<{ url: string; init?: RequestInit }> = [];
  const deletionHttpApi = createHttpAuthApi({
    baseUrl: "https://example.com",
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      deletionRequests.push({ url: String(input), init });
      return new Response(null, { status: 204 });
    }) as typeof fetch
  });
  await deletionHttpApi.deleteAccount("account-access-token", TEST_OPERATION_ID, TEST_RECOVERY_SECRET);
  assert.equal(deletionRequests[0]?.url, "https://example.com/auth/account");
  assert.equal(deletionRequests[0]?.init?.method, "DELETE");
  assert.equal((deletionRequests[0]?.init?.headers as Record<string, string>).Authorization, "Bearer account-access-token");
  assert.deepEqual(JSON.parse(String(deletionRequests[0]?.init?.body)), {
    confirmation: "DELETE",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET
  });

  const generatedRecovery = await createAccountDeletionRecoveryMaterial({
    randomUuid: () => TEST_OPERATION_ID,
    randomBytes: async () => Uint8Array.from({ length: 32 }, (_, index) => index)
  });
  assert.equal(generatedRecovery.operationId, TEST_OPERATION_ID);
  assert.match(generatedRecovery.recoverySecret, /^[A-Za-z0-9_-]{43}$/);

  const secureValues = new Map<string, string>();
  const secureRecoveryStorage = createAccountDeletionSecretStorage({
    async getItemAsync(key) { return secureValues.get(key) ?? null; },
    async setItemAsync(key, value) { secureValues.set(key, value); },
    async deleteItemAsync(key) { secureValues.delete(key); }
  });
  const secureProof: AccountDeletionRecoveryProof = {
    version: 1,
    ownerId: "owner-secure",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET
  };
  await secureRecoveryStorage.set(secureProof);
  assert.deepEqual(await secureRecoveryStorage.get(), secureProof);
  await secureRecoveryStorage.clear();
  assert.equal(await secureRecoveryStorage.get(), null);

  const markerFailureEvents: string[] = [];
  const markerFailureState: TestRecoveryState = { current: null };
  await assert.rejects(
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: deletionCleanup(markerFailureEvents),
      async pauseAndDrain() { markerFailureEvents.push("pause"); },
      resume() { markerFailureEvents.push("resume"); },
      ...recoveryCallbacks(markerFailureEvents, markerFailureState),
      async persistDeletionRecovery() { markerFailureEvents.push("persist-recovery-failed"); throw new Error("storage unavailable"); },
      async deleteRemoteAccount() { markerFailureEvents.push("unexpected-remote"); },
      async clearAuthSession() { markerFailureEvents.push("unexpected-clear"); }
    }),
    (error: unknown) => error instanceof AuthFlowError
  );
  assert.deepEqual(markerFailureEvents, ["pause", "prepare", "create-recovery", "persist-recovery-failed", "discard-recovery", "rollback", "resume"]);

  const lostResponseEvents: string[] = [];
  const lostResponseState: TestRecoveryState = { current: null };
  let credentialsCleared = false;
  await assert.rejects(
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: deletionCleanup(lostResponseEvents),
      async pauseAndDrain() { lostResponseEvents.push("pause"); },
      resume() { lostResponseEvents.push("resume"); },
      ...recoveryCallbacks(lostResponseEvents, lostResponseState),
      async deleteRemoteAccount() {
        lostResponseEvents.push("remote");
        throw new AuthFlowError("network_error");
      },
      async clearAuthSession() {
        credentialsCleared = true;
      }
    }),
    (error: unknown) => error instanceof AccountDeletionCleanupPendingError
  );
  assert.deepEqual(lostResponseEvents, ["pause", "prepare", "create-recovery", "persist-recovery", "remote"]);
  assert.equal(lostResponseState.current?.pending.state, "requested", "lost responses must leave the durable state retryable");
  assert.equal(credentialsCleared, false, "an ambiguous remote result must preserve credentials and the durable intent");

  const successfulDeletionEvents: string[] = [];
  const successfulDeletionState: TestRecoveryState = { current: null };
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
    ...recoveryCallbacks(successfulDeletionEvents, successfulDeletionState),
    async deleteRemoteAccount() {
      successfulDeletionEvents.push("remote");
    },
    async clearAuthSession() {
      successfulDeletionEvents.push("clear-auth");
    }
  });
  assert.deepEqual(successfulDeletionEvents, [
    "pause", "prepare", "create-recovery", "persist-recovery", "remote", "state:server_confirmed",
    "state:local_cleanup", "commit", "clear-auth", "resume"
  ]);

  const retryableCleanupEvents: string[] = [];
  const retryableRecoveryState: TestRecoveryState = { current: null };
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
      async pauseAndDrain() {
        retryableCleanupEvents.push("pause");
      },
      resume() {
        retryableCleanupEvents.push("resume");
      },
      ...recoveryCallbacks(retryableCleanupEvents, retryableRecoveryState),
      async deleteRemoteAccount() {
        retryableCleanupEvents.push("remote");
      },
      async clearAuthSession() {
        retryableCleanupEvents.push("clear-auth");
      },
      markDeletionComplete() {
        retryableRecoveryState.current = null;
      }
    });
  await assert.rejects(deletionAttempt(), (error: unknown) => error instanceof AccountDeletionCleanupPendingError);
  assert.equal(retryableRecoveryState.current?.pending.state, "local_cleanup", "a confirmed remote deletion must remain recorded for local-cleanup retry");
  assert.deepEqual(retryableCleanupEvents, [
    "pause", "prepare", "create-recovery", "persist-recovery", "remote", "state:server_confirmed",
    "state:local_cleanup", "commit-1"
  ]);
  await deletionAttempt();
  assert.deepEqual(retryableCleanupEvents, [
    "pause", "prepare", "create-recovery", "persist-recovery", "remote", "state:server_confirmed",
    "state:local_cleanup", "commit-1", "pause", "prepare", "state:local_cleanup", "commit-2", "clear-auth", "resume"
  ]);
  assert.equal(retryableRecoveryState.current, null);

  const credentialRetryEvents: string[] = [];
  let credentialClearAttempts = 0;
  const credentialProof: AccountDeletionRecoveryProof = {
    version: 1,
    ownerId: "owner-1",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET
  };
  const credentialRecoveryState: TestRecoveryState = {
    current: {
      pending: { version: 3, operationId: TEST_OPERATION_ID, state: "local_cleanup" },
      proof: credentialProof
    }
  };
  const credentialRetryAttempt = () =>
    executeAccountDeletion({
      accessToken: "access",
      ownerId: "owner-1",
      registeredCleanup: {
        ownerId: "owner-1",
        async prepare() {
          credentialRetryEvents.push("prepare");
        },
        async commit() {
          credentialRetryEvents.push("commit");
        },
        async rollback() {
          credentialRetryEvents.push("rollback");
        }
      },
      async pauseAndDrain() {
        credentialRetryEvents.push("pause");
      },
      resume() {
        credentialRetryEvents.push("resume");
      },
      ...recoveryCallbacks(credentialRetryEvents, credentialRecoveryState),
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
  assert.deepEqual(credentialRetryEvents, [
    "pause", "prepare", "state:local_cleanup", "commit", "clear-auth-1",
    "pause", "prepare", "state:local_cleanup", "commit", "clear-auth-2", "resume"
  ]);

  const refreshedDeletionEvents: string[] = [];
  await deleteRemoteAccountWithRefresh({
    accessToken: "expired-access",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET,
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

  const receiptRecoveryEvents: string[] = [];
  await reconcilePendingAccountDeletion({
    expectedOwnerId: "owner-old",
    accessToken: "new-account-access",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET,
    async deleteRemoteAccount(accessToken) {
      receiptRecoveryEvents.push(`delete:${accessToken}`);
    },
    async getCurrentUser() {
      throw new Error("receipt reconciliation must not inspect the current account");
    },
    async getRefreshToken() {
      throw new Error("receipt reconciliation must not refresh the current account");
    },
    async refreshSession() {
      throw new Error("receipt reconciliation must not refresh the current account");
    },
    async persistRefreshedSession() {
      throw new Error("receipt reconciliation must not persist a session");
    }
  });
  assert.deepEqual(receiptRecoveryEvents, ["delete:null"], "a receipt must reconcile by proof before any account credential is used");

  const ownerBoundRecoveryEvents: string[] = [];
  await reconcilePendingAccountDeletion({
    expectedOwnerId: "owner-old",
    accessToken: "old-account-access",
    operationId: TEST_OPERATION_ID,
    recoverySecret: TEST_RECOVERY_SECRET,
    async deleteRemoteAccount(accessToken) {
      ownerBoundRecoveryEvents.push(`delete:${accessToken}`);
      if (accessToken === null) throw new AuthFlowError("session_expired");
    },
    async getCurrentUser(accessToken) {
      ownerBoundRecoveryEvents.push(`me:${accessToken}`);
      return { id: "owner-old" };
    },
    async getRefreshToken() {
      throw new Error("valid owner access must not refresh");
    },
    async refreshSession() {
      throw new Error("valid owner access must not refresh");
    },
    async persistRefreshedSession() {
      throw new Error("valid owner access must not persist a refresh");
    }
  });
  assert.deepEqual(ownerBoundRecoveryEvents, ["delete:null", "me:old-account-access", "delete:old-account-access"]);

  const crossAccountRecoveryEvents: string[] = [];
  await assert.rejects(
    reconcilePendingAccountDeletion({
      expectedOwnerId: "owner-old",
      accessToken: "new-account-access",
      operationId: TEST_OPERATION_ID,
      recoverySecret: TEST_RECOVERY_SECRET,
      async deleteRemoteAccount(accessToken) {
        crossAccountRecoveryEvents.push(`delete:${accessToken}`);
        if (accessToken === null) throw new AuthFlowError("session_expired");
        throw new Error("authenticated deletion must not run for another account");
      },
      async getCurrentUser(accessToken) {
        crossAccountRecoveryEvents.push(`me:${accessToken}`);
        return { id: "owner-new" };
      },
      async getRefreshToken() {
        crossAccountRecoveryEvents.push("unexpected-refresh-token");
        return "new-account-refresh";
      },
      async refreshSession() {
        throw new Error("another account must not be refreshed for deletion");
      },
      async persistRefreshedSession() {
        throw new Error("another account must not be persisted for deletion");
      }
    }),
    (error: unknown) => error instanceof AuthFlowError && error.code === "session_expired"
  );
  assert.deepEqual(
    crossAccountRecoveryEvents,
    ["delete:null", "me:new-account-access"],
    "failed deletion -> auth reset -> different-account sign-in must never issue an authenticated DELETE"
  );

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
