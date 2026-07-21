import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { TokenStorage } from "../types";

const REFRESH_TOKEN_KEY = "trainer-auth-refresh-token";
const ACCESS_TOKEN_KEY = "trainer-auth-access-token";
const fallbackTokenStorage = createMemoryTokenStorage();

type SecureStoreModule = {
  getValueWithKeyAsync(key: string, options: Record<string, never>): Promise<string | null>;
  setValueWithKeyAsync(value: string, key: string, options: Record<string, never>): Promise<void>;
  deleteValueWithKeyAsync(key: string, options: Record<string, never>): Promise<void>;
};

export function createSecureTokenStorage(): TokenStorage {
  if (Platform.OS === "web") {
    return fallbackTokenStorage;
  }

  return {
    async getRefreshToken() {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.getValueWithKeyAsync(REFRESH_TOKEN_KEY, {}) : fallbackTokenStorage.getRefreshToken();
    },
    async setRefreshToken(token) {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.setValueWithKeyAsync(token, REFRESH_TOKEN_KEY, {}) : fallbackTokenStorage.setRefreshToken(token);
    },
    async removeRefreshToken() {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.deleteValueWithKeyAsync(REFRESH_TOKEN_KEY, {}) : fallbackTokenStorage.removeRefreshToken();
    },
    async getAccessToken() {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.getValueWithKeyAsync(ACCESS_TOKEN_KEY, {}) : fallbackTokenStorage.getAccessToken();
    },
    async setAccessToken(token) {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.setValueWithKeyAsync(token, ACCESS_TOKEN_KEY, {}) : fallbackTokenStorage.setAccessToken(token);
    },
    async removeAccessToken() {
      const secureStore = await getSecureStoreModule();
      return secureStore ? secureStore.deleteValueWithKeyAsync(ACCESS_TOKEN_KEY, {}) : fallbackTokenStorage.removeAccessToken();
    },
    async clearAuthTokens() {
      const secureStore = await getSecureStoreModule();
      if (!secureStore) {
        await fallbackTokenStorage.clearAuthTokens();
        return;
      }
      await Promise.all([secureStore.deleteValueWithKeyAsync(REFRESH_TOKEN_KEY, {}), secureStore.deleteValueWithKeyAsync(ACCESS_TOKEN_KEY, {})]);
    }
  };
}

export function createMemoryTokenStorage(initialTokens: { refreshToken?: string | null; accessToken?: string | null } = {}): TokenStorage {
  let refreshToken = initialTokens.refreshToken ?? null;
  let accessToken = initialTokens.accessToken ?? null;

  return {
    async getRefreshToken() {
      return refreshToken;
    },
    async setRefreshToken(token) {
      refreshToken = token;
    },
    async removeRefreshToken() {
      refreshToken = null;
    },
    async getAccessToken() {
      return accessToken;
    },
    async setAccessToken(token) {
      accessToken = token;
    },
    async removeAccessToken() {
      accessToken = null;
    },
    async clearAuthTokens() {
      refreshToken = null;
      accessToken = null;
    }
  };
}

async function getSecureStoreModule(): Promise<SecureStoreModule | null> {
  const nativeModule = requireOptionalNativeModule<SecureStoreModule>("ExpoSecureStore");
  if (!nativeModule || typeof nativeModule.getValueWithKeyAsync !== "function") return null;
  return nativeModule;
}
