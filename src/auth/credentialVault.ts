import type { AuthCredential, CredentialVault } from "./types";

export function createMemoryCredentialVault(initialCredential: AuthCredential | null = null): CredentialVault {
  let credential = initialCredential;

  return {
    async read() {
      return credential ? cloneCredential(credential) : null;
    },
    async write(nextCredential) {
      credential = cloneCredential(nextCredential);
    },
    async clear() {
      credential = null;
    }
  };
}

export function cloneCredential(credential: AuthCredential): AuthCredential {
  return {
    accessToken: credential.accessToken,
    session: { ...credential.session }
  };
}
