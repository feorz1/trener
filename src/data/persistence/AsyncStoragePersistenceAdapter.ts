import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistedSnapshot } from "./PersistedSnapshot";
import { PersistenceError, type PersistenceAdapter } from "./PersistenceAdapter";
import { LOCAL_DATA_STORAGE_KEY } from "./storageKeys";

export class AsyncStoragePersistenceAdapter implements PersistenceAdapter {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_DATA_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
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
      await AsyncStorage.removeItem(LOCAL_DATA_STORAGE_KEY);
    } catch (error) {
      throw new PersistenceError("Unable to clear local data", error);
    }
  }

  async hasData() {
    try {
      return (await AsyncStorage.getItem(LOCAL_DATA_STORAGE_KEY)) !== null;
    } catch (error) {
      throw new PersistenceError("Unable to check local data", error);
    }
  }
}

export const localPersistenceAdapter = new AsyncStoragePersistenceAdapter();
