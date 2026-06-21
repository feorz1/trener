import { LOCAL_OWNER_ID, type OwnerId } from "../types";

export const LEGACY_LOCAL_DATA_STORAGE_KEY = "trainer-app:data:v1";

export function getLocalDataStorageKey(ownerId: OwnerId = LOCAL_OWNER_ID) {
  return `trainer-app:${ownerId}:data:v2`;
}

export const LOCAL_DATA_STORAGE_KEY = getLocalDataStorageKey();
