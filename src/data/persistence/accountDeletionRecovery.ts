import AsyncStorage from "@react-native-async-storage/async-storage";
import { AsyncStoragePersistenceAdapter, type AsyncStoragePersistenceStore } from "./AsyncStoragePersistenceAdapter";
import { SessionTimerPersistence, type SessionTimerStorage } from "./SessionTimerPersistence";

export const PENDING_ACCOUNT_DELETION_STORAGE_KEY = "trainer-app:account-deletion-pending:v1";

type AccountDeletionRecoveryStorage = AsyncStoragePersistenceStore &
  SessionTimerStorage & {
    removeItem(key: string): Promise<void>;
  };

type CredentialPurger = {
  clearAuthTokens(): Promise<void>;
};

export async function markPendingAccountDeletion(
  ownerId: string,
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  await storage.setItem(
    PENDING_ACCOUNT_DELETION_STORAGE_KEY,
    JSON.stringify({ version: 1, ownerId })
  );
}

export async function clearPendingAccountDeletion(
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
}

export async function recoverPendingAccountDeletion(
  credentialPurger: CredentialPurger,
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  const rawMarker = await storage.getItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
  if (!rawMarker) return false;

  const ownerId = readPendingOwnerId(rawMarker);
  if (!ownerId) {
    await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
    return false;
  }

  // Keep the marker until every idempotent purge succeeds. On the next launch
  // a partial cleanup starts from the beginning and cannot bootstrap the old
  // owner in between attempts.
  await new SessionTimerPersistence(storage, ownerId).closeAndClearOwner([]);
  await new AsyncStoragePersistenceAdapter(ownerId, storage).clear();
  await credentialPurger.clearAuthTokens();
  await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
  return true;
}

function readPendingOwnerId(rawMarker: string) {
  try {
    const marker = JSON.parse(rawMarker) as { version?: unknown; ownerId?: unknown };
    return marker.version === 1 && typeof marker.ownerId === "string" && marker.ownerId.length > 0
      ? marker.ownerId
      : null;
  } catch {
    return null;
  }
}
