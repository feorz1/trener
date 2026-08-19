import type { AuthError, AuthProvidersAvailability, AuthSession, AuthState, AuthUser } from "./types";

export const initialAuthState: AuthState = {
  status: "checking",
  user: null,
  accessToken: null,
  expiresAt: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingEmail: null,
  providers: null
};

export function createUnauthenticatedState(input: Partial<Pick<AuthState, "error" | "pendingEmail" | "providers">> = {}): AuthState {
  return {
    status: "unauthenticated",
    user: null,
    accessToken: null,
    expiresAt: null,
    isAuthenticated: false,
    isLoading: false,
    error: input.error ?? null,
    pendingEmail: input.pendingEmail ?? null,
    providers: input.providers ?? null
  };
}

export function createAuthenticatingState(previous: AuthState, next: Partial<Pick<AuthState, "pendingEmail" | "error">> = {}): AuthState {
  return {
    ...previous,
    status: "authenticating",
    isLoading: true,
    isAuthenticated: false,
    error: next.error ?? null,
    pendingEmail: next.pendingEmail ?? previous.pendingEmail
  };
}

export function createAuthenticatedState(session: AuthSession, providers: AuthProvidersAvailability | null): AuthState {
  return {
    status: "authenticated",
    user: session.user,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    pendingEmail: null,
    providers
  };
}

export function createAuthenticatedStateFromUser(user: AuthUser, accessToken: string, expiresAt: string, providers: AuthProvidersAvailability | null): AuthState {
  return {
    status: "authenticated",
    user,
    accessToken,
    expiresAt,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    pendingEmail: null,
    providers
  };
}

export function createAuthErrorState(error: AuthError, previous: AuthState): AuthState {
  return {
    ...previous,
    status: "error",
    isAuthenticated: false,
    isLoading: false,
    error
  };
}
