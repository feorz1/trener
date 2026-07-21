import AsyncStorage from "@react-native-async-storage/async-storage";

export const asyncStorageKeyValueStore = {
  getItem(key: string) {
    return AsyncStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    return AsyncStorage.setItem(key, value);
  }
};
