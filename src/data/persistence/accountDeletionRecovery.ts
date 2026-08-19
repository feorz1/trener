import AsyncStorage from "@react-native-async-storage/async-storage";
import { AsyncStoragePersistenceAdapter, type AsyncStoragePersistenceStore } from "./AsyncStoragePersistenceAdapter";
import { SessionTimerPersistence, type SessionTimerStorage } from "./SessionTimerPersistence";

export const PENDING_ACCOUNT_DELETION_STORAGE_KEY = "trainer-app:account-deletion-pending:v1";

export type PendingAccountDeletion = {
  version: 3;
  operationId: string;
  state: "requested" | "server_confirmed" | "local_cleanup" | "completed";
};

type AccountDeletionRecoveryStorage = AsyncStoragePersistenceStore &
  SessionTimerStorage & {
    removeItem(key: string): Promise<void>;
  };

type CredentialPurger = {
  clearAuthTokens(): Promise<void>;
};

export async function markPendingAccountDeletion(
  operationId: string,
  state: PendingAccountDeletion["state"] = "requested",
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  await storage.setItem(
    PENDING_ACCOUNT_DELETION_STORAGE_KEY,
    JSON.stringify({ version: 3, operationId, state })
  );
}

export async function readPendingAccountDeletion(
  storage: AccountDeletionRecoveryStorage = AsyncStorage
): Promise<PendingAccountDeletion | null> {
  const rawMarker = await storage.getItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
  if (!rawMarker) return null;
  return parsePendingAccountDeletion(rawMarker);
}

export async function hasPendingAccountDeletion(
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  return (await storage.getItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY)) !== null;
}

export async function clearPendingAccountDeletion(
  storage: AccountDeletionRecoveryStorage = AsyncStorage
) {
  await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
}

export async function recoverPendingAccountDeletion(
  credentialPurger: CredentialPurger,
  storage: AccountDeletionRecoveryStorage = AsyncStorage,
  confirmRemoteDeletion?: (pending: PendingAccountDeletion) => Promise<{ ownerId: string }>
) {
  const rawMarker = await storage.getItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
  if (!rawMarker) return false;

  const pending = parsePendingAccountDeletion(rawMarker);
  const legacyOwnerId = readLegacyPendingOwnerId(rawMarker);
  if (pending?.state === "completed") {
    await credentialPurger.clearAuthTokens();
    await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
    return true;
  }
  let ownerId = legacyOwnerId;
  if (!ownerId) {
    if (!pending) {
      await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
      return false;
    }
    if (!confirmRemoteDeletion) throw new Error("Account deletion reconciliation is unavailable");
    ownerId = (await confirmRemoteDeletion(pending)).ownerId;
  }

  // Version 1 was written only after the legacy server DELETE completed. A
  // version 3 marker is written before DELETE and therefore must be reconciled
  // with the server before any credential or owner data is purged.
  if (pending?.state === "requested") await markPendingAccountDeletion(pending.operationId, "server_confirmed", storage);
  if (pending) await markPendingAccountDeletion(pending.operationId, "local_cleanup", storage);

  // Keep the marker until every idempotent purge succeeds. On the next launch
  // a partial cleanup starts from the beginning and cannot bootstrap the old
  // owner in between attempts.
  await new SessionTimerPersistence(storage, ownerId).closeAndClearOwner([]);
  await new AsyncStoragePersistenceAdapter(ownerId, storage).clear();
  await credentialPurger.clearAuthTokens();
  await storage.removeItem(PENDING_ACCOUNT_DELETION_STORAGE_KEY);
  return true;
}

function parsePendingAccountDeletion(rawMarker: string): PendingAccountDeletion | null {
  try {
    const marker = JSON.parse(rawMarker) as { version?: unknown; operationId?: unknown; state?: unknown };
    if (
      marker.version !== 3 ||
      typeof marker.operationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(marker.operationId) ||
      (marker.state !== "requested" && marker.state !== "server_confirmed" && marker.state !== "local_cleanup" && marker.state !== "completed")
    ) return null;
    return { version: 3, operationId: marker.operationId, state: marker.state };
  } catch {
    return null;
  }
}

function readLegacyPendingOwnerId(rawMarker: string) {
  try {
    const marker = JSON.parse(rawMarker) as { version?: unknown; ownerId?: unknown };
    return marker.version === 1 && typeof marker.ownerId === "string" && marker.ownerId.length > 0 ? marker.ownerId : null;
  } catch {
    return null;
  }
}
