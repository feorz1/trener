import * as SecureStore from "expo-secure-store";
import { createAccountDeletionSecretStorage } from "./accountDeletionSecretStorage";

export function createNativeAccountDeletionSecretStorage() {
  return createAccountDeletionSecretStorage(SecureStore, {
    keychainService: "trainer.account-deletion-recovery",
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}
