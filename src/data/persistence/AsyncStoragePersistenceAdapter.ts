import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistedSnapshot } from "./PersistedSnapshot";
import { PersistenceError, type PersistenceAdapter } from "./PersistenceAdapter";
import { LEGACY_LOCAL_DATA_STORAGE_KEY, LOCAL_DATA_STORAGE_KEY } from "./storageKeys";

export class AsyncStoragePersistenceAdapter implements PersistenceAdapter {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_DATA_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as unknown;

      const legacyRaw = await AsyncStorage.getItem(LEGACY_LOCAL_DATA_STORAGE_KEY);
      if (!legacyRaw) return null;
      return JSON.parse(legacyRaw) as unknown;
    } catch (error) {
      throw new PersistenceError("Unable to load local data", error);
    }
  }

  async save(snapshot: PersistedSnapshot) {
    try {
      await AsyncStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      throw new PersistenceError("Unable to save local data", error);
    }
  }

  async clear() {
    try {
      await AsyncStorage.multiRemove([LOCAL_DATA_STORAGE_KEY, LEGACY_LOCAL_DATA_STORAGE_KEY]);
    } catch (error) {
      throw new PersistenceError("Unable to clear local data", error);
    }
  }

  async hasData() {
    try {
      const [current, legacy] = await AsyncStorage.multiGet([LOCAL_DATA_STORAGE_KEY, LEGACY_LOCAL_DATA_STORAGE_KEY]);
      return current[1] !== null || legacy[1] !== null;
    } catch (error) {
      throw new PersistenceError("Unable to check local data", error);
    }
  }
}

export const localPersistenceAdapter = new AsyncStoragePersistenceAdapter();
