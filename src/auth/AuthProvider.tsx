import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRootNavigationState, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppSplashScreen } from "@/features/splash/AppSplashScreen";
import { clearPendingAccountDeletion, hasPendingAccountDeletion, markPendingAccountDeletion, readPendingAccountDeletion, recoverPendingAccountDeletion } from "@/data/persistence/accountDeletionRecovery";
import { createNativeAccountDeletionRecoveryMaterial } from "./nativeAccountDeletionRecoveryMaterial";
import { createAuthorizedFetch } from "./api/apiClient";
import { createDefaultAuthApi } from "./api/authApi";
import { authConfig, envProvidersAvailability, mergeProviderAvailability } from "./config";
import { createSecureTokenStorage } from "./services/secureTokenStorage";
import { createAuthenticatedState, createAuthenticatedStateFromUser, createAuthenticatingState, createAuthErrorState, createUnauthenticatedState, initialAuthState } from "./state";
import type { AuthApiClient, AuthError, AuthProvidersAvailability, AuthSession, AuthState, TokenStorage } from "./types";
import { AuthFlowError, createAuthError, normalizeAuthError } from "./utils/authErrors";
import { isValidEmail, normalizeEmail } from "./utils/email";
import { getAuthRouteDecision, SIGN_IN_ROUTE } from "./routes";
import { AccountDeletionCleanupPendingError, deleteRemoteAccountWithRefresh, executeAccountDeletion, reconcilePendingAccountDeletion, type AccountDeletionCleanup } from "./accountDeletion";
import { createNativeAccountDeletionSecretStorage } from "./services/nativeAccountDeletionSecretStorage";
import { restoreAuthSession } from "./sessionRecovery";

export type AuthContextValue = {
  state: AuthState;
  checkSession: () => Promise<void>;
  loadAuthProviders: () => Promise<void>;
  startEmailLogin: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendEmailCode: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  registerAccountDeletionCleanup: (cleanup: AccountDeletionCleanup) => () => void;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  setAuthSession: (session: AuthSession) => Promise<void>;
  clearAuthSession: () => Promise<void>;
  resetAuthStorage: () => Promise<void>;
  clearAuthError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const defaultAuthApi = createDefaultAuthApi();
const defaultTokenStorage = createSecureTokenStorage();
const defaultAccountDeletionSecretStorage = createNativeAccountDeletionSecretStorage();

export function AuthProvider({
  children,
  authApi = defaultAuthApi,
  tokenStorage = defaultTokenStorage
}: {
  children: ReactNode;
  authApi?: AuthApiClient;
  tokenStorage?: TokenStorage;
}) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const stateRef = useRef(state);
  const registeredLocalCleanupRef = useRef<AccountDeletionCleanup | null>(null);
  const accountDeletionPromiseRef = useRef<Promise<void> | null>(null);
  const authorizedRequestsPausedRef = useRef(false);
  const activeAuthorizedRequestsRef = useRef(new Map<Promise<Response>, AbortController>());
  const sessionCheckPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setProviders = useCallback((providers: AuthProvidersAvailability) => {
    setState((current) => ({ ...current, providers }));
  }, []);

  const loadAuthProviders = useCallback(async () => {
    try {
      const providers = mergeProviderAvailability(await authApi.getAuthProviders());
      setProviders(providers);
    } catch {
      setProviders(envProvidersAvailability);
    }
  }, [authApi, setProviders]);

  const clearAuthSession = useCallback(async () => {
    try {
      await tokenStorage.clearAuthTokens();
    } finally {
      setState(createUnauthenticatedState({ providers: stateRef.current.providers }));
    }
  }, [tokenStorage]);

  const clearDeletedAccountSession = useCallback(async (operationId: string) => {
    // Unlike ordinary session expiry, a failed SecureStore purge must keep the
    // deletion flow retryable. Transition to sign-in only after both token
    // keys have been removed successfully.
    await tokenStorage.clearAuthTokens();
    await markPendingAccountDeletion(operationId, "completed");
    await defaultAccountDeletionSecretStorage.clear();
    await clearPendingAccountDeletion();
    setState(createUnauthenticatedState({ providers: stateRef.current.providers }));
  }, [tokenStorage]);

  const setAuthSession = useCallback(
    async (session: AuthSession) => {
      if (await hasPendingAccountDeletion()) {
        throw new AccountDeletionCleanupPendingError(new Error("Account deletion recovery must finish before sign-in"));
      }
      await Promise.all([tokenStorage.setRefreshToken(session.refreshToken), tokenStorage.setAccessToken(session.accessToken)]);
      setState(createAuthenticatedState(session, stateRef.current.providers));
    },
    [tokenStorage]
  );

  const checkSession = useCallback(() => {
    if (sessionCheckPromiseRef.current) return sessionCheckPromiseRef.current;
    if (authorizedRequestsPausedRef.current) return Promise.resolve();

    const operation = (async () => {
      setState((current) => ({ ...current, status: "checking", isLoading: true, error: null }));

      const result = await restoreAuthSession({
        authApi,
        tokenStorage,
        recoverPendingDeletion: async () => {
          await recoverPendingAccountDeletion(tokenStorage, undefined, async (pending) => {
            const proof = await defaultAccountDeletionSecretStorage.get();
            if (!proof || proof.operationId !== pending.operationId) {
              throw new Error("Account deletion recovery proof is unavailable");
            }
            if (pending.state === "requested") {
              await reconcilePendingAccountDeletion({
                expectedOwnerId: proof.ownerId,
                accessToken: await tokenStorage.getAccessToken(),
                operationId: pending.operationId,
                recoverySecret: proof.recoverySecret,
                deleteRemoteAccount: (accessToken, operationId, recoverySecret) => authApi.deleteAccount(accessToken, operationId, recoverySecret),
                getCurrentUser: (accessToken) => authApi.getMe(accessToken),
                getRefreshToken: () => tokenStorage.getRefreshToken(),
                refreshSession: (refreshToken) => authApi.refresh(refreshToken),
                persistRefreshedSession: async (refreshed) => {
                  await Promise.all([tokenStorage.setRefreshToken(refreshed.refreshToken), tokenStorage.setAccessToken(refreshed.accessToken)]);
                }
              });
            }
            return { ownerId: proof.ownerId };
          });
          await defaultAccountDeletionSecretStorage.clear();
        }
      });

      if (result.status === "authenticated") {
        setState(createAuthenticatedStateFromUser(result.user, result.accessToken, result.expiresAt, stateRef.current.providers));
      } else if (result.status === "unauthenticated") {
        setState(createUnauthenticatedState({ error: result.error, providers: stateRef.current.providers }));
      } else {
        setState((current) => createAuthErrorState(result.error, current));
      }
    })();

    const trackedOperation = operation.finally(() => {
      if (sessionCheckPromiseRef.current === trackedOperation) {
        sessionCheckPromiseRef.current = null;
      }
    });
    sessionCheckPromiseRef.current = trackedOperation;
    return trackedOperation;
  }, [authApi, tokenStorage]);

  const startEmailLogin = useCallback(
    async (email: string) => {
      const normalized = normalizeEmail(email);
      if (!isValidEmail(normalized)) {
        const error = createAuthError("invalid_email");
        setState((current) => createUnauthenticatedState({ ...pickAuthFlowState(current), error }));
        throw new AuthFlowError(error.code, error.message);
      }

      setState((current) => createAuthenticatingState(current, { pendingEmail: normalized }));
      try {
        await authApi.startEmailLogin(normalized);
        setState((current) => createUnauthenticatedState({ ...pickAuthFlowState(current), pendingEmail: normalized }));
      } catch (error) {
        const authError = normalizeAuthError(error, "network_error");
        setState((current) => createUnauthenticatedState({ ...pickAuthFlowState(current), pendingEmail: normalized, error: authError }));
        throw new AuthFlowError(authError.code, authError.message, { cause: error });
      }
    },
    [authApi]
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      const normalized = normalizeEmail(email);
      setState((current) => createAuthenticatingState(current, { pendingEmail: normalized }));
      try {
        const session = await authApi.verifyEmailCode(normalized, code);
        await setAuthSession(session);
      } catch (error) {
        const authError = normalizeAuthError(error, "network_error");
        setState((current) => createUnauthenticatedState({ ...pickAuthFlowState(current), pendingEmail: normalized, error: authError }));
        throw new AuthFlowError(authError.code, authError.message, { cause: error });
      }
    },
    [authApi, setAuthSession]
  );

  const resendEmailCode = useCallback(
    async (email: string) => {
      await startEmailLogin(email);
    },
    [startEmailLogin]
  );

  const refreshSession = useCallback(async () => {
    await checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      await clearAuthSession();
    }
  }, [authApi, clearAuthSession, tokenStorage]);

  const registerAccountDeletionCleanup = useCallback((cleanup: AccountDeletionCleanup) => {
    registeredLocalCleanupRef.current = cleanup;
    return () => {
      if (registeredLocalCleanupRef.current === cleanup) {
        registeredLocalCleanupRef.current = null;
      }
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setState((current) => ({ ...current, status: current.isAuthenticated ? "authenticated" : "unauthenticated", isLoading: false, error: null }));
  }, []);

  const resetAuthStorage = useCallback(async () => {
    setState((current) => ({ ...current, status: "checking", isLoading: true, error: null }));
    try {
      if (await hasPendingAccountDeletion()) {
        throw new AccountDeletionCleanupPendingError(new Error("Account deletion recovery must finish before auth reset"));
      }
      await tokenStorage.clearAuthTokens();
      setState(createUnauthenticatedState({ providers: stateRef.current.providers }));
    } catch (error) {
      const authError = normalizeAuthError(error, "server_error");
      setState((current) => createAuthErrorState(authError, current));
    }
  }, [tokenStorage]);

  const baseAuthorizedFetch = useMemo(
    () =>
      createAuthorizedFetch({
        authApi,
        tokenStorage,
        getAccessToken: () => stateRef.current.accessToken,
        setAccessToken: (accessToken, expiresAt) => {
          setState((current) => ({ ...current, accessToken, expiresAt }));
        },
        onSessionExpired: clearAuthSession
      }),
    [authApi, clearAuthSession, tokenStorage]
  );

  const authorizedFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      if (authorizedRequestsPausedRef.current) {
        return Promise.reject(new AuthFlowError("session_expired"));
      }

      const controller = new AbortController();
      const upstreamSignal = init?.signal;
      const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
      if (upstreamSignal?.aborted) {
        abortFromUpstream();
      } else {
        upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
      }

      const request = baseAuthorizedFetch(input, { ...init, signal: controller.signal });
      const trackedRequest = request.finally(() => {
        upstreamSignal?.removeEventListener("abort", abortFromUpstream);
        activeAuthorizedRequestsRef.current.delete(trackedRequest);
      });
      activeAuthorizedRequestsRef.current.set(trackedRequest, controller);
      return trackedRequest;
    },
    [baseAuthorizedFetch]
  );

  const deleteAccount = useCallback((): Promise<void> => {
    if (accountDeletionPromiseRef.current) return accountDeletionPromiseRef.current;

    const ownerId = stateRef.current.isAuthenticated ? stateRef.current.user?.id ?? null : null;

    const operation = executeAccountDeletion({
      accessToken: stateRef.current.isAuthenticated ? stateRef.current.accessToken : null,
      ownerId,
      registeredCleanup: registeredLocalCleanupRef.current,
      pauseAndDrain: async () => {
        authorizedRequestsPausedRef.current = true;
        const activeRequests = [...activeAuthorizedRequestsRef.current.entries()];
        activeRequests.forEach(([, controller]) => controller.abort());
        const activeOperations: Promise<unknown>[] = activeRequests.map(([request]) => request);
        if (sessionCheckPromiseRef.current) activeOperations.push(sessionCheckPromiseRef.current);
        await Promise.allSettled(activeOperations);
      },
      resume: () => {
        authorizedRequestsPausedRef.current = false;
      },
      loadDeletionRecovery: async () => {
        const [pending, proof] = await Promise.all([
          readPendingAccountDeletion(),
          defaultAccountDeletionSecretStorage.get()
        ]);
        if (!pending && !proof) return null;
        if (!pending || !proof || pending.operationId !== proof.operationId) {
          throw new AccountDeletionCleanupPendingError(new Error("Account deletion recovery state is incomplete"));
        }
        return { pending, proof };
      },
      createDeletionRecovery: async (recoveryOwnerId) => {
        const material = await createNativeAccountDeletionRecoveryMaterial();
        return { version: 1, ownerId: recoveryOwnerId, ...material };
      },
      persistDeletionRecovery: async (proof) => {
        await defaultAccountDeletionSecretStorage.set(proof);
        try {
          await markPendingAccountDeletion(proof.operationId, "requested");
        } catch (error) {
          await defaultAccountDeletionSecretStorage.clear().catch(() => undefined);
          throw error;
        }
        return { version: 3, operationId: proof.operationId, state: "requested" };
      },
      discardDeletionRecovery: async () => {
        await clearPendingAccountDeletion();
        await defaultAccountDeletionSecretStorage.clear();
      },
      markDeletionState: (operationId, deletionState) => markPendingAccountDeletion(operationId, deletionState),
      deleteRemoteAccount: (accessToken, operationId, recoverySecret) =>
        deleteRemoteAccountWithRefresh({
          accessToken,
          operationId,
          recoverySecret,
          deleteRemoteAccount: (token, pendingOperationId, pendingRecoverySecret) => authApi.deleteAccount(token, pendingOperationId, pendingRecoverySecret),
          getRefreshToken: () => tokenStorage.getRefreshToken(),
          refreshSession: (refreshToken) => authApi.refresh(refreshToken),
          persistRefreshedSession: async (refreshed) => {
            await Promise.all([tokenStorage.setRefreshToken(refreshed.refreshToken), tokenStorage.setAccessToken(refreshed.accessToken)]);
            setState((current) => ({ ...current, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt }));
          }
        }),
      clearAuthSession: clearDeletedAccountSession,
      markDeletionComplete: () => undefined
    });

    const trackedOperation = operation.finally(() => {
      if (accountDeletionPromiseRef.current === trackedOperation) {
        accountDeletionPromiseRef.current = null;
      }
    });
    accountDeletionPromiseRef.current = trackedOperation;
    return trackedOperation;
  }, [authApi, clearDeletedAccountSession, tokenStorage]);

  useEffect(() => {
    void loadAuthProviders();
    void checkSession();
  }, [checkSession, loadAuthProviders]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      checkSession,
      loadAuthProviders,
      startEmailLogin,
      verifyEmailCode,
      resendEmailCode,
      refreshSession,
      logout,
      deleteAccount,
      registerAccountDeletionCleanup,
      authorizedFetch,
      setAuthSession,
      clearAuthSession,
      resetAuthStorage,
      clearAuthError
    }),
    [authorizedFetch, checkSession, clearAuthError, clearAuthSession, deleteAccount, loadAuthProviders, logout, refreshSession, registerAccountDeletionCleanup, resendEmailCode, resetAuthStorage, setAuthSession, startEmailLogin, state, verifyEmailCode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthRouteBoundary({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const decision = getAuthRouteDecision(state, pathname);

  useEffect(() => {
    if (!authConfig.authEnabled || !rootNavigationState?.key) return;
    if (decision === "redirect_to_sign_in") {
      if (router.canDismiss()) router.dismissAll();
      router.replace(SIGN_IN_ROUTE);
    }
    if (decision === "redirect_to_app") {
      router.replace("/");
    }
    if (decision === "redirect_to_connection_error") {
      router.replace("/auth/connection-error");
    }
  }, [decision, rootNavigationState?.key, router]);

  if (!authConfig.authEnabled) return children;

  if (state.status === "checking" || decision !== "allow") {
    if (decision !== "allow") {
      return (
        <View style={styles.boundaryRoot}>
          <View style={styles.boundaryContent}>{children}</View>
          <View style={styles.boundaryOverlay}>
            <AppSplashScreen />
          </View>
        </View>
      );
    }
    return <AppSplashScreen />;
  }

  return children;
}

const styles = StyleSheet.create({
  boundaryRoot: {
    flex: 1
  },
  boundaryContent: {
    flex: 1,
    opacity: 0
  },
  boundaryOverlay: {
    ...StyleSheet.absoluteFillObject
  }
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthProvider is missing");
  }
  return context;
}

function pickAuthFlowState(state: AuthState): Pick<AuthState, "pendingEmail" | "providers"> & { error?: AuthError | null } {
  return {
    pendingEmail: state.pendingEmail,
    providers: state.providers,
    error: state.error
  };
}
