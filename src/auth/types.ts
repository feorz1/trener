import type { OwnerId } from "@/types";

export type AuthStatus = "loading" | "signed_out" | "signed_in" | "expired";

export type AuthProviderKind = "development";

export type AuthSession = {
  id: string;
  ownerId: OwnerId;
  provider: AuthProviderKind;
  displayName: string;
  issuedAt: string;
  expiresAt?: string;
};

export type AuthCredential = {
  session: AuthSession;
  accessToken: string;
};

export type SignedOutReason = "initial" | "logout" | "expired" | "provider_unavailable";

export type AuthState =
  | {
      status: "loading";
      session: null;
      signedOutReason: null;
    }
  | {
      status: "signed_out";
      session: null;
      signedOutReason: SignedOutReason;
    }
  | {
      status: "signed_in";
      session: AuthSession;
      signedOutReason: null;
    }
  | {
      status: "expired";
      session: null;
      signedOutReason: "expired";
    };

export type SignInInput = {
  displayName?: string;
};

export type SignOutMode = "preserve_local_data" | "clear_local_data";

export type SignOutOptions = {
  mode?: SignOutMode;
};

export interface AuthProviderClient {
  restore(): Promise<AuthCredential | null>;
  signIn(input?: SignInInput): Promise<AuthCredential>;
  signOut(credential: AuthCredential | null): Promise<void>;
}

export interface CredentialVault {
  read(): Promise<AuthCredential | null>;
  write(credential: AuthCredential): Promise<void>;
  clear(): Promise<void>;
}
