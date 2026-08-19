export { AuthProvider, AuthRouteBoundary, useAuth, type AuthContextValue } from "./AuthProvider";
export { createAuthorizedFetch } from "./api/apiClient";
export { createDefaultAuthApi, createHttpAuthApi } from "./api/authApi";
export { authConfig, envProvidersAvailability, mergeProviderAvailability } from "./config";
export { AUTH_CONNECTION_ERROR_ROUTE, SIGN_IN_ROUTE, getAuthRouteDecision, type AuthRouteDecision } from "./routes";
export { createMemoryTokenStorage, createSecureTokenStorage } from "./services/secureTokenStorage";
export { AccountDeletionCleanupPendingError } from "./accountDeletion";
export { createAuthenticatedState, createAuthenticatedStateFromUser, createAuthenticatingState, createAuthErrorState, createUnauthenticatedState, initialAuthState } from "./state";
export {
  type AuthApiClient,
  type AuthError,
  type AuthErrorCode,
  type AuthProvider as AuthProviderKind,
  type AuthProvidersAvailability,
  type AuthRefreshResult,
  type AuthSession,
  type AuthState,
  type AuthStatus,
  type AuthUser,
  type EmailLoginStartResult,
  type TokenStorage
} from "./types";
export { AUTH_ERROR_MESSAGES, AuthFlowError, createAuthError, isAuthErrorCode, normalizeAuthError } from "./utils/authErrors";
export { isValidEmail, normalizeEmail } from "./utils/email";
