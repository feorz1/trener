import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SetTimerState } from "@/features/workouts/tracking";
import { LOCAL_OWNER_ID } from "../types";
import { PersistenceError } from "./PersistenceAdapter";

const LEGACY_SESSION_TIMER_STORAGE_PREFIX = "trainer-app:session-timer:v1";

export type SessionTimerStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
  multiGet?(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiRemove?(keys: readonly string[]): Promise<void>;
};

export function getSessionTimerStorageKey(ownerId: string, sessionId: string) {
  return `trainer-app:${ownerId}:session-timer:v2:${sessionId}`;
}

export function getLegacySessionTimerStorageKey(sessionId: string) {
  return `${LEGACY_SESSION_TIMER_STORAGE_PREFIX}:${sessionId}`;
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isSetTimerState(value: unknown): value is SetTimerState {
  if (!value || typeof value !== "object") return false;
  const timer = value as Partial<SetTimerState>;
  return (
    typeof timer.workoutId === "string" &&
    typeof timer.exerciseId === "string" &&
    typeof timer.setId === "string" &&
    (timer.metricKey === "duration" || timer.metricKey === "interval") &&
    (timer.mode === "countdown" || timer.mode === "stopwatch") &&
    (timer.status === "idle" || timer.status === "running" || timer.status === "paused" || timer.status === "finished") &&
    typeof timer.accumulatedSeconds === "number" &&
    Number.isFinite(timer.accumulatedSeconds) &&
    timer.accumulatedSeconds >= 0 &&
    isOptionalFiniteNumber(timer.targetSeconds) &&
    isOptionalFiniteNumber(timer.startedAt) &&
    isOptionalFiniteNumber(timer.endsAt)
  );
}

export class SessionTimerPersistence {
  private pendingWrite = Promise.resolve();
  private paused = false;
  private closed = false;

  constructor(
    private readonly storage: SessionTimerStorage = AsyncStorage,
    private readonly ownerId = LOCAL_OWNER_ID
  ) {}

  async load(sessionId: string) {
    try {
      await this.pendingWrite;
      const storageKey = getSessionTimerStorageKey(this.ownerId, sessionId);
      const legacyStorageKey = getLegacySessionTimerStorageKey(sessionId);
      const ownerRaw = await this.storage.getItem(storageKey);
      // An authenticated owner must never claim an unscoped v1 timer. Legacy
      // migration remains available only to the original local-only owner.
      const legacyRaw = this.ownerId === LOCAL_OWNER_ID ? await this.storage.getItem(legacyStorageKey) : null;
      const raw = ownerRaw ?? legacyRaw;
      if (!raw) return null;
      const timer = JSON.parse(raw) as unknown;
      if (!isSetTimerState(timer)) {
        await this.storage.removeItem(ownerRaw ? storageKey : legacyStorageKey);
        return null;
      }
      if (!ownerRaw) {
        await this.storage.setItem(storageKey, raw);
        await this.storage.removeItem(legacyStorageKey);
      }
      return timer;
    } catch (error) {
      throw new PersistenceError("Unable to load the active session timer", error);
    }
  }

  save(sessionId: string, timer: SetTimerState | null) {
    if (this.paused || this.closed) {
      return Promise.reject(new PersistenceError("Session timer persistence is paused"));
    }
    const write = this.pendingWrite.then(async () => {
      const key = getSessionTimerStorageKey(this.ownerId, sessionId);
      if (!timer) {
        await this.storage.removeItem(key);
        return;
      }
      await this.storage.setItem(key, JSON.stringify(timer));
    }).catch((error: unknown) => {
      throw new PersistenceError("Unable to save the active session timer", error);
    });
    this.pendingWrite = write.catch(() => undefined);
    return write;
  }

  async drain() {
    await this.pendingWrite;
  }

  async pauseAndDrain() {
    this.paused = true;
    await this.drain();
  }

  resume() {
    if (!this.closed) {
      this.paused = false;
    }
  }

  async closeAndClearOwner(knownSessionIds: readonly string[]) {
    this.paused = true;
    this.closed = true;
    await this.drain();

    const keys = new Set<string>();
    const ownerPrefix = `trainer-app:${this.ownerId}:session-timer:v2:`;
    if (this.storage.getAllKeys) {
      const storageKeys = await this.storage.getAllKeys();
      storageKeys.filter((key) => key.startsWith(ownerPrefix)).forEach((key) => keys.add(key));
      // v1 belongs to the documented pre-auth local-only profile, not to an
      // authenticated owner. Only deletion of that local profile may purge it.
      if (this.ownerId === LOCAL_OWNER_ID) {
        storageKeys.filter((key) => key.startsWith(`${LEGACY_SESSION_TIMER_STORAGE_PREFIX}:`)).forEach((key) => keys.add(key));
      }
    } else {
      knownSessionIds.forEach((sessionId) => keys.add(getSessionTimerStorageKey(this.ownerId, sessionId)));
      if (this.ownerId === LOCAL_OWNER_ID) {
        knownSessionIds.forEach((sessionId) => keys.add(getLegacySessionTimerStorageKey(sessionId)));
      }
    }

    if (keys.size === 0) return;
    if (this.storage.multiRemove) {
      await this.storage.multiRemove([...keys]);
      return;
    }
    await Promise.all([...keys].map((key) => this.storage.removeItem(key)));
  }
}

export const sessionTimerPersistence = new SessionTimerPersistence();

export function createSessionTimerPersistence(ownerId: string, storage?: SessionTimerStorage) {
  return new SessionTimerPersistence(storage, ownerId);
}
