import { authStateFromCredential, signedOutState } from "./state";
import type { AuthCredential, AuthProviderClient, CredentialVault, SignInInput, SignOutOptions } from "./types";

export async function restoreAuthSession(provider: AuthProviderClient, credentialVault: CredentialVault) {
  const credential = (await credentialVault.read()) ?? (await provider.restore());
  const state = authStateFromCredential(credential);

  if (state.status !== "signed_in") {
    await credentialVault.clear();
    return { state: state.status === "expired" ? signedOutState("expired") : state, credential: null };
  }

  await credentialVault.write(credential!);
  return { state, credential };
}

export async function signInWithProvider(provider: AuthProviderClient, credentialVault: CredentialVault, input?: SignInInput) {
  const credential = await provider.signIn(input);
  await credentialVault.write(credential);
  return { state: authStateFromCredential(credential), credential };
}

export async function signOutWithProvider(input: {
  provider: AuthProviderClient;
  credentialVault: CredentialVault;
  credential: AuthCredential | null;
  options?: SignOutOptions;
  onClearLocalData?: () => Promise<void>;
}) {
  await input.provider.signOut(input.credential);
  await input.credentialVault.clear();
  if (input.options?.mode === "clear_local_data") {
    await input.onClearLocalData?.();
  }
  return { state: signedOutState("logout"), credential: null };
}
