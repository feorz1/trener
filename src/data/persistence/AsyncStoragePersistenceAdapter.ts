import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistedSnapshot } from "./PersistedSnapshot";
import { PersistenceError, type PersistenceAdapter } from "./PersistenceAdapter";
import { LOCAL_OWNER_ID, type OwnerId } from "../types";
import { getLocalDataStorageKey, LEGACY_LOCAL_DATA_STORAGE_KEY } from "./storageKeys";

export type AsyncStoragePersistenceStore = Pick<typeof AsyncStorage, "getItem" | "setItem" | "multiGet" | "multiRemove">;

export class AsyncStoragePersistenceAdapter implements PersistenceAdapter {
  private readonly storageKey: string;

  constructor(
    private readonly ownerId: OwnerId = LOCAL_OWNER_ID,
    private readonly storage: AsyncStoragePersistenceStore = AsyncStorage
  ) {
    this.storageKey = getLocalDataStorageKey(ownerId);
  }

  async load() {
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw) as unknown;

      if (this.ownerId !== LOCAL_OWNER_ID) return null;

      const legacyRaw = await this.storage.getItem(LEGACY_LOCAL_DATA_STORAGE_KEY);
      if (!legacyRaw) return null;
      return JSON.parse(legacyRaw) as unknown;
    } catch (error) {
      throw new PersistenceError("Unable to load local data", error);
    }
  }

  async save(snapshot: PersistedSnapshot) {
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (error) {
      throw new PersistenceError("Unable to save local data", error);
    }
  }

  async clear() {
    try {
      // The v1 key is the documented pre-auth local-only profile. It is not
      // attributable to an authenticated owner and is cleared only when that
      // local profile itself is the active owner.
      const keys = this.ownerId === LOCAL_OWNER_ID ? [this.storageKey, LEGACY_LOCAL_DATA_STORAGE_KEY] : [this.storageKey];
      await this.storage.multiRemove(keys);
    } catch (error) {
      throw new PersistenceError("Unable to clear local data", error);
    }
  }

  async hasData() {
    try {
      const keys = this.ownerId === LOCAL_OWNER_ID ? [this.storageKey, LEGACY_LOCAL_DATA_STORAGE_KEY] : [this.storageKey];
      const values = await this.storage.multiGet(keys);
      return values.some(([, value]) => value !== null);
    } catch (error) {
      throw new PersistenceError("Unable to check local data", error);
    }
  }
}

export const localPersistenceAdapter = new AsyncStoragePersistenceAdapter();

export function createLocalPersistenceAdapter(ownerId: OwnerId) {
  return new AsyncStoragePersistenceAdapter(ownerId);
}
