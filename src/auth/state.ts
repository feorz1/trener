import type { AuthCredential, AuthSession, AuthState, SignedOutReason } from "./types";

export const initialAuthState: AuthState = {
  status: "loading",
  session: null,
  signedOutReason: null
};

export function isAuthSessionExpired(session: AuthSession, now = new Date()): boolean {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now.getTime();
}

export function authStateFromCredential(credential: AuthCredential | null, now = new Date()): AuthState {
  if (!credential) return signedOutState("initial");
  if (isAuthSessionExpired(credential.session, now)) return expiredAuthState();
  return signedInState(credential.session);
}

export function signedInState(session: AuthSession): AuthState {
  return {
    status: "signed_in",
    session,
    signedOutReason: null
  };
}

export function signedOutState(reason: SignedOutReason): AuthState {
  return {
    status: "signed_out",
    session: null,
    signedOutReason: reason
  };
}

export function expiredAuthState(): AuthState {
  return {
    status: "expired",
    session: null,
    signedOutReason: "expired"
  };
}
