import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Loader } from "@/components/ui";
import { theme } from "@/theme";
import { createMemoryCredentialVault } from "./credentialVault";
import { createDevelopmentAuthProvider } from "./developmentProvider";
import { restoreAuthSession, signInWithProvider, signOutWithProvider } from "./operations";
import { initialAuthState, signedOutState } from "./state";
import { getAuthRouteDecision, SIGN_IN_ROUTE } from "./routes";
import type { AuthCredential, AuthProviderClient, AuthState, CredentialVault, SignInInput, SignOutOptions } from "./types";

type AuthContextValue = {
  state: AuthState;
  signInDevelopment: (input?: SignInInput) => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const defaultAuthProvider = createDevelopmentAuthProvider();
const defaultCredentialVault = createMemoryCredentialVault();

export function AuthProvider({
  children,
  provider = defaultAuthProvider,
  credentialVault = defaultCredentialVault,
  onClearLocalData
}: {
  children: ReactNode;
  provider?: AuthProviderClient;
  credentialVault?: CredentialVault;
  onClearLocalData?: () => Promise<void>;
}) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const credentialRef = useRef<AuthCredential | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const restored = await restoreAuthSession(provider, credentialVault);

      if (cancelled) return;

      credentialRef.current = restored.credential;
      setState(restored.state);
    }

    void restoreSession().catch(() => {
      if (!cancelled) {
        credentialRef.current = null;
        setState(signedOutState("provider_unavailable"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [credentialVault, provider]);

  const signInDevelopment = useCallback(
    async (input?: SignInInput) => {
      const next = await signInWithProvider(provider, credentialVault, input);
      credentialRef.current = next.credential;
      setState(next.state);
    },
    [credentialVault, provider]
  );

  const signOut = useCallback(
    async (options: SignOutOptions = {}) => {
      const next = await signOutWithProvider({ provider, credentialVault, credential: credentialRef.current, options, onClearLocalData });
      credentialRef.current = next.credential;
      setState(next.state);
    },
    [credentialVault, onClearLocalData, provider]
  );

  const value = useMemo(() => ({ state, signInDevelopment, signOut }), [signInDevelopment, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthRouteBoundary({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const decision = getAuthRouteDecision(state, pathname);

  useEffect(() => {
    if (decision === "redirect_to_sign_in") {
      router.replace(SIGN_IN_ROUTE);
    }
    if (decision === "redirect_to_app") {
      router.replace("/");
    }
  }, [decision, router]);

  if (state.status === "loading" || decision !== "allow") {
    return (
      <View style={styles.loadingScreen}>
        <Loader size="medium" tone="brand" />
      </View>
    );
  }

  return children;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthProvider is missing");
  }
  return context;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background.canvasSoft
  }
});
