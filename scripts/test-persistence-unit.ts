import assert from "node:assert/strict";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { createProductionState } from "../src/data/seeds/productionSeed";
import { AsyncStoragePersistenceAdapter, InMemoryPersistenceAdapter, PersistenceCoordinator, CURRENT_SCHEMA_VERSION, LEGACY_LOCAL_DATA_STORAGE_KEY, getLocalDataStorageKey, hydrateDataState, migrateSnapshot, serializeDataState } from "../src/data/persistence";
import { SessionTimerPersistence, getLegacySessionTimerStorageKey, getSessionTimerStorageKey } from "../src/data/persistence/SessionTimerPersistence";
import { PENDING_ACCOUNT_DELETION_STORAGE_KEY, markPendingAccountDeletion, recoverPendingAccountDeletion } from "../src/data/persistence/accountDeletionRecovery";
import { SessionResultWriteQueue } from "../src/data/remote/sessionResultWriteQueue";
import { getTimerElapsedSeconds, type SetTimerState } from "../src/features/workouts/tracking";
import { LOCAL_OWNER_ID } from "../src/types";

async function run() {
  const adapter = new InMemoryPersistenceAdapter();
  assert.equal(await adapter.load(), null);
  assert.equal(await adapter.hasData(), false);

  const productionState = createProductionState();
  assert.deepEqual(productionState.clientIds, []);
  assert.deepEqual(productionState.workoutIds, []);
  assert.deepEqual(productionState.sessionIds, []);
  assert.deepEqual(productionState.resultIds, []);
  assert.deepEqual(productionState.quickValueIds, []);
  assert.ok(productionState.exerciseIds.length > 0);

  const initialState = createInitialState();
  assert.ok(initialState.clientIds.length > 0);
  assert.ok(initialState.workoutIds.length > 0);
  const profiledClientId = initialState.clientIds[0];
  initialState.clientsById[profiledClientId].restrictions = ["Без осевых нагрузок"];
  initialState.clientsById[profiledClientId].intake = {
    ageYears: 31,
    targetWeightKg: 60,
    healthConstraints: ["Травмы спины"],
    exerciseRestrictions: ["Без осевых нагрузок"],
    activityLevel: "Активная",
    sleep: "6-8 часов",
    workoutsPerWeek: 3,
    trainingExperience: "Занимаюсь регулярно",
    sports: ["Футбол"]
  };
  const snapshot = serializeDataState(initialState, "2026-06-19T10:30:00.000Z");
  assert.equal(CURRENT_SCHEMA_VERSION, 2);
  assert.equal(snapshot.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(snapshot.savedAt, "2026-06-19T10:30:00.000Z");
  assert.equal(getLocalDataStorageKey(LOCAL_OWNER_ID), `trainer-app:${LOCAL_OWNER_ID}:data:v2`);
  assert.equal(LEGACY_LOCAL_DATA_STORAGE_KEY, "trainer-app:data:v1");

  await adapter.save(snapshot);
  assert.equal(await adapter.hasData(), true);
  const loadedSnapshot = migrateSnapshot(await adapter.load());
  assert.equal(loadedSnapshot.schemaVersion, snapshot.schemaVersion);
  assert.deepEqual(loadedSnapshot.data.clients.map((client) => client.id), snapshot.data.clients.map((client) => client.id));
  assert.deepEqual(loadedSnapshot.data.workouts.map((workout) => workout.id), snapshot.data.workouts.map((workout) => workout.id));

  const hydrated = hydrateDataState(loadedSnapshot);
  assert.deepEqual(hydrated.clientIds, initialState.clientIds);
  assert.deepEqual(hydrated.clientsById[profiledClientId].intake, initialState.clientsById[profiledClientId].intake);
  assert.notEqual(hydrated.clientsById[profiledClientId].intake?.sports, initialState.clientsById[profiledClientId].intake?.sports);
  assert.deepEqual(hydrated.workoutIds, initialState.workoutIds);

  const legacySnapshot = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot & { schemaVersion: 1 };
  legacySnapshot.schemaVersion = 1;
  delete (legacySnapshot as { meta?: unknown }).meta;
  for (const collection of [
    legacySnapshot.data.clients,
    legacySnapshot.data.exercises ?? [],
    legacySnapshot.data.workouts,
    legacySnapshot.data.sessions,
    legacySnapshot.data.results,
    legacySnapshot.data.quickValues
  ]) {
    for (const item of collection) {
      delete (item as { ownerId?: string }).ownerId;
    }
  }

  const migratedLegacy = migrateSnapshot(legacySnapshot);
  assert.equal(migratedLegacy.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migratedLegacy.meta.activeSessionId, null);
  assert.deepEqual(migratedLegacy.data.clients.map((client) => client.id), snapshot.data.clients.map((client) => client.id));
  assert.deepEqual(migratedLegacy.data.workouts.map((workout) => workout.id), snapshot.data.workouts.map((workout) => workout.id));
  const hydratedLegacy = hydrateDataState(migratedLegacy);
  assert.ok(hydratedLegacy.clientIds.every((id) => hydratedLegacy.clientsById[id].ownerId === LOCAL_OWNER_ID));
  assert.ok(hydratedLegacy.workoutIds.every((id) => hydratedLegacy.workoutsById[id].ownerId === LOCAL_OWNER_ID));
  assert.ok(hydratedLegacy.sessionIds.every((id) => hydratedLegacy.sessionsById[id].ownerId === LOCAL_OWNER_ID));
  assert.ok(hydratedLegacy.resultIds.every((id) => hydratedLegacy.resultsById[id].ownerId === LOCAL_OWNER_ID));
  assert.ok(hydratedLegacy.quickValueIds.every((id) => hydratedLegacy.quickValuesById[id].ownerId === LOCAL_OWNER_ID));

  const invalidV2Snapshot = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
  delete (invalidV2Snapshot.data.clients[0] as { ownerId?: string }).ownerId;
  assert.throws(() => migrateSnapshot(invalidV2Snapshot));

  const invalidIntakeSnapshot = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
  invalidIntakeSnapshot.data.clients[0].intake!.workoutsPerWeek = 2.5;
  assert.throws(() => migrateSnapshot(invalidIntakeSnapshot));

  assert.throws(() => migrateSnapshot({ schemaVersion: 999, savedAt: snapshot.savedAt, data: {} }));

  const asyncStorageValues = new Map<string, string>();
  const asyncStorage = {
    async getItem(key: string) {
      return asyncStorageValues.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      asyncStorageValues.set(key, value);
    },
    async multiGet(keys: readonly string[]) {
      return keys.map((key) => [key, asyncStorageValues.get(key) ?? null] as [string, string | null]);
    },
    async multiRemove(keys: readonly string[]) {
      keys.forEach((key) => asyncStorageValues.delete(key));
    }
  };
  const ownerAAdapter = new AsyncStoragePersistenceAdapter("owner-a", asyncStorage);
  const ownerBAdapter = new AsyncStoragePersistenceAdapter("owner-b", asyncStorage);
  await ownerAAdapter.save(snapshot);
  await ownerBAdapter.save(snapshot);
  await asyncStorage.setItem("trainer-app:data:v1", JSON.stringify(snapshot));
  await asyncStorage.setItem("trainer-app:theme-preference:v1", "dark");
  await ownerAAdapter.clear();
  assert.equal(await ownerAAdapter.load(), null, "deleted owner snapshot must not reappear");
  assert.notEqual(await asyncStorage.getItem("trainer-app:data:v1"), null, "pre-auth local-only snapshot must survive authenticated-owner deletion");
  assert.notEqual(await ownerBAdapter.load(), null, "another owner's snapshot must survive deletion");
  assert.equal(await asyncStorage.getItem("trainer-app:theme-preference:v1"), "dark", "device-global theme must survive deletion");
  assert.ok(createProductionState().exerciseIds.length > 0, "canonical exercise seed must survive owner-cache deletion");

  const timerValues = new Map<string, string>();
  const timerStorage = {
    async getItem(key: string) {
      return timerValues.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      timerValues.set(key, value);
    },
    async removeItem(key: string) {
      timerValues.delete(key);
    },
    async getAllKeys() {
      return [...timerValues.keys()];
    },
    async multiGet(keys: readonly string[]) {
      return keys.map((key) => [key, timerValues.get(key) ?? null] as const);
    },
    async multiRemove(keys: readonly string[]) {
      keys.forEach((key) => timerValues.delete(key));
    }
  };
  const runningTimer: SetTimerState = {
    workoutId: "workout-1",
    exerciseId: "session-exercise-1",
    setId: "set-1",
    metricKey: "duration",
    mode: "countdown",
    status: "running",
    targetSeconds: 30,
    startedAt: 1_720_000_000_000,
    endsAt: 1_720_000_030_000,
    accumulatedSeconds: 0
  };
  const firstTimerScreen = new SessionTimerPersistence(timerStorage, "owner-a");
  await firstTimerScreen.save("session-1", runningTimer);
  const reopenedTimerScreen = new SessionTimerPersistence(timerStorage, "owner-a");
  const restoredRunningTimer = await reopenedTimerScreen.load("session-1");
  assert.deepEqual(restoredRunningTimer, runningTimer);
  assert.equal(getTimerElapsedSeconds(restoredRunningTimer!, runningTimer.startedAt! + 5_000), 5);
  assert.equal(await reopenedTimerScreen.load("session-2"), null);
  const { startedAt: _startedAt, endsAt: _endsAt, ...timerWithoutRunningDates } = runningTimer;
  const pausedTimer: SetTimerState = {
    ...timerWithoutRunningDates,
    status: "paused",
    accumulatedSeconds: 12
  };
  await reopenedTimerScreen.save("session-1", pausedTimer);
  assert.deepEqual(await firstTimerScreen.load("session-1"), pausedTimer);
  await reopenedTimerScreen.save("session-1", null);
  assert.equal(await firstTimerScreen.load("session-1"), null);

  const ownerATimers = new SessionTimerPersistence(timerStorage, "owner-a");
  const ownerBTimers = new SessionTimerPersistence(timerStorage, "owner-b");
  await ownerATimers.save("shared-session-name", runningTimer);
  await ownerBTimers.save("shared-session-name", pausedTimer);
  assert.deepEqual(await ownerATimers.load("shared-session-name"), runningTimer);
  assert.deepEqual(await ownerBTimers.load("shared-session-name"), pausedTimer);
  timerValues.set(getLegacySessionTimerStorageKey("legacy-owner-a"), JSON.stringify(runningTimer));
  timerValues.set(getLegacySessionTimerStorageKey("legacy-owner-b"), JSON.stringify(pausedTimer));
  timerValues.set(getLegacySessionTimerStorageKey("legacy-unattributed"), JSON.stringify(pausedTimer));
  timerValues.set("trainer-app:owner-b:data:v2", JSON.stringify({ data: { sessions: [{ id: "legacy-owner-b" }] } }));
  assert.equal(await ownerATimers.load("legacy-unattributed"), null, "an authenticated owner must not claim an unattributed v1 timer");
  assert.equal(timerValues.has(getLegacySessionTimerStorageKey("legacy-unattributed")), true);
  await ownerATimers.closeAndClearOwner(["shared-session-name", "legacy-owner-a"]);
  assert.equal(timerValues.has(getSessionTimerStorageKey("owner-a", "shared-session-name")), false);
  assert.equal(timerValues.has(getLegacySessionTimerStorageKey("legacy-owner-a")), true, "authenticated deletion must preserve pre-auth local-only timers");
  assert.equal(timerValues.has(getSessionTimerStorageKey("owner-b", "shared-session-name")), true, "another owner's timer must survive deletion");
  assert.equal(timerValues.has(getLegacySessionTimerStorageKey("legacy-owner-b")), true, "pre-auth local-only timers must survive authenticated deletion");
  assert.equal(timerValues.has(getLegacySessionTimerStorageKey("legacy-unattributed")), true, "unscoped legacy timers must not be assigned to an authenticated owner");

  let releaseSave: (() => void) | undefined;
  let markSaveStarted: (() => void) | undefined;
  const saveStarted = new Promise<void>((resolve) => {
    markSaveStarted = resolve;
  });
  const saveBlocked = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let deferredSnapshot: typeof snapshot | null = null;
  const deferredAdapter = {
    async load() {
      return deferredSnapshot;
    },
    async save(nextSnapshot: typeof snapshot) {
      markSaveStarted?.();
      await saveBlocked;
      deferredSnapshot = nextSnapshot;
    },
    async clear() {
      deferredSnapshot = null;
    },
    async hasData() {
      return deferredSnapshot !== null;
    }
  };
  const persistenceCoordinator = new PersistenceCoordinator(deferredAdapter, 0);
  const pendingSave = persistenceCoordinator.saveImmediately(initialState);
  await saveStarted;
  const pendingClear = persistenceCoordinator.closeAndClear();
  releaseSave?.();
  await Promise.all([pendingSave, pendingClear]);
  assert.equal(deferredSnapshot, null, "an in-flight save must not recreate a deleted owner snapshot");

  const writeQueue = new SessionResultWriteQueue();
  let releaseQueue: (() => void) | undefined;
  const queueBlocked = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  const queuedWrite = writeQueue.enqueue("session-queue", async () => {
    await queueBlocked;
    return "saved";
  });
  const queueDrain = writeQueue.pauseAndDrain();
  await assert.rejects(writeQueue.enqueue("new-session", async () => "unexpected"), /paused/);
  releaseQueue?.();
  await queueDrain;
  assert.equal(await queuedWrite, "saved");
  writeQueue.resume();
  assert.equal(await writeQueue.enqueue("resumed-session", async () => "resumed"), "resumed");
  await writeQueue.close();
  await assert.rejects(writeQueue.enqueue("closed-session", async () => "unexpected"), /paused/);

  const recoveryValues = new Map<string, string>();
  const recoveryStorage = {
    async getItem(key: string) {
      return recoveryValues.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      recoveryValues.set(key, value);
    },
    async removeItem(key: string) {
      recoveryValues.delete(key);
    },
    async getAllKeys() {
      return [...recoveryValues.keys()];
    },
    async multiGet(keys: readonly string[]) {
      return keys.map((key) => [key, recoveryValues.get(key) ?? null] as const);
    },
    async multiRemove(keys: readonly string[]) {
      keys.forEach((key) => recoveryValues.delete(key));
    }
  };
  recoveryValues.set(getLocalDataStorageKey("owner-recovery-a"), JSON.stringify(snapshot));
  recoveryValues.set(getLocalDataStorageKey("owner-recovery-b"), JSON.stringify(snapshot));
  recoveryValues.set(LEGACY_LOCAL_DATA_STORAGE_KEY, JSON.stringify(snapshot));
  recoveryValues.set(getSessionTimerStorageKey("owner-recovery-a", "session-a"), JSON.stringify(runningTimer));
  recoveryValues.set(getSessionTimerStorageKey("owner-recovery-b", "session-b"), JSON.stringify(pausedTimer));
  recoveryValues.set(getLegacySessionTimerStorageKey("legacy-recovery"), JSON.stringify(runningTimer));
  recoveryValues.set("trainer-app:theme-preference:v1", "dark");
  await markPendingAccountDeletion("owner-recovery-a", recoveryStorage);
  let recoveredCredentialsCleared = false;
  assert.equal(
    await recoverPendingAccountDeletion(
      {
        async clearAuthTokens() {
          recoveredCredentialsCleared = true;
        }
      },
      recoveryStorage
    ),
    true
  );
  assert.equal(recoveredCredentialsCleared, true);
  assert.equal(recoveryValues.has(getLocalDataStorageKey("owner-recovery-a")), false);
  assert.equal(recoveryValues.has(getSessionTimerStorageKey("owner-recovery-a", "session-a")), false);
  assert.equal(recoveryValues.has(LEGACY_LOCAL_DATA_STORAGE_KEY), true);
  assert.equal(recoveryValues.has(getLegacySessionTimerStorageKey("legacy-recovery")), true);
  assert.equal(recoveryValues.has(getLocalDataStorageKey("owner-recovery-b")), true);
  assert.equal(recoveryValues.has(getSessionTimerStorageKey("owner-recovery-b", "session-b")), true);
  assert.equal(recoveryValues.get("trainer-app:theme-preference:v1"), "dark");
  assert.equal(recoveryValues.has(PENDING_ACCOUNT_DELETION_STORAGE_KEY), false);

  await markPendingAccountDeletion("owner-recovery-a", recoveryStorage);
  await assert.rejects(
    recoverPendingAccountDeletion(
      {
        async clearAuthTokens() {
          throw new Error("transient SecureStore failure");
        }
      },
      recoveryStorage
    ),
    /transient SecureStore failure/
  );
  assert.equal(recoveryValues.has(PENDING_ACCOUNT_DELETION_STORAGE_KEY), true, "recovery marker must survive partial cleanup");
  await recoverPendingAccountDeletion({ async clearAuthTokens() {} }, recoveryStorage);
  assert.equal(recoveryValues.has(PENDING_ACCOUNT_DELETION_STORAGE_KEY), false);

  await adapter.clear();
  assert.equal(await adapter.load(), null);
}

run()
  .then(() => console.log("Persistence unit tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
