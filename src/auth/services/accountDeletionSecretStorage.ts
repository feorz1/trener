const ACCOUNT_DELETION_RECOVERY_KEY = "trainer.account-deletion-recovery.v1";
const ACCOUNT_DELETION_KEYCHAIN_SERVICE = "trainer.account-deletion-recovery";

export type AccountDeletionRecoveryProof = {
  version: 1;
  ownerId: string;
  operationId: string;
  recoverySecret: string;
};

export type AccountDeletionSecretStorage = {
  get(): Promise<AccountDeletionRecoveryProof | null>;
  set(proof: AccountDeletionRecoveryProof): Promise<void>;
  clear(): Promise<void>;
};

export type AccountDeletionSecureStoreOptions = { keychainService?: string; keychainAccessible?: number };
export type AccountDeletionSecureStoreLike = {
  getItemAsync(key: string, options?: AccountDeletionSecureStoreOptions): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: AccountDeletionSecureStoreOptions): Promise<void>;
  deleteItemAsync(key: string, options?: AccountDeletionSecureStoreOptions): Promise<void>;
};

export function createAccountDeletionSecretStorage(
  storage: AccountDeletionSecureStoreLike,
  options: AccountDeletionSecureStoreOptions = { keychainService: ACCOUNT_DELETION_KEYCHAIN_SERVICE }
): AccountDeletionSecretStorage {

  return {
    async get() {
      const raw = await storage.getItemAsync(ACCOUNT_DELETION_RECOVERY_KEY, options);
      if (!raw) return null;
      return parseRecoveryProof(raw);
    },
    async set(proof) {
      assertRecoveryProof(proof);
      await storage.setItemAsync(ACCOUNT_DELETION_RECOVERY_KEY, JSON.stringify(proof), options);
    },
    async clear() {
      await storage.deleteItemAsync(ACCOUNT_DELETION_RECOVERY_KEY, options);
    }
  };
}

function parseRecoveryProof(raw: string): AccountDeletionRecoveryProof {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Account deletion recovery proof is corrupted");
  }
  assertRecoveryProof(value);
  return value;
}

function assertRecoveryProof(value: unknown): asserts value is AccountDeletionRecoveryProof {
  if (!value || typeof value !== "object") throw new Error("Account deletion recovery proof is invalid");
  const proof = value as Partial<AccountDeletionRecoveryProof>;
  if (
    proof.version !== 1 ||
    typeof proof.ownerId !== "string" ||
    proof.ownerId.length === 0 ||
    typeof proof.operationId !== "string" ||
    !isUuidV4(proof.operationId) ||
    typeof proof.recoverySecret !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(proof.recoverySecret)
  ) {
    throw new Error("Account deletion recovery proof is invalid");
  }
}

function isUuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
