import { LOCAL_OWNER_ID } from "@/types";
import type { AuthCredential, AuthProviderClient, SignInInput } from "./types";

const DEVELOPMENT_SESSION_ID = "development-local-session";

export function createDevelopmentAuthProvider(now: () => Date = () => new Date()): AuthProviderClient {
  return {
    async restore() {
      return null;
    },
    async signIn(input?: SignInInput) {
      const issuedAt = now().toISOString();
      return {
        accessToken: `dev-local-token:${issuedAt}`,
        session: {
          id: DEVELOPMENT_SESSION_ID,
          ownerId: LOCAL_OWNER_ID,
          provider: "development",
          displayName: input?.displayName?.trim() || "Локальный тренер",
          issuedAt
        }
      };
    },
    async signOut() {
      return undefined;
    }
  };
}

export function createExpiredDevelopmentCredential(expiresAt: string): AuthCredential {
  return {
    accessToken: "expired-dev-local-token",
    session: {
      id: DEVELOPMENT_SESSION_ID,
      ownerId: LOCAL_OWNER_ID,
      provider: "development",
      displayName: "Локальный тренер",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt
    }
  };
}
