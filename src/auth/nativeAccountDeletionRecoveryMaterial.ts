import * as Crypto from "expo-crypto";
import { createAccountDeletionRecoveryMaterial } from "./accountDeletionRecoveryMaterial";

export function createNativeAccountDeletionRecoveryMaterial() {
  return createAccountDeletionRecoveryMaterial({
    randomUuid: Crypto.randomUUID,
    randomBytes: Crypto.getRandomBytesAsync
  });
}
