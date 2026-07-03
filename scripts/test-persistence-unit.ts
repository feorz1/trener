import assert from "node:assert/strict";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { InMemoryPersistenceAdapter, CURRENT_SCHEMA_VERSION, LEGACY_LOCAL_DATA_STORAGE_KEY, getLocalDataStorageKey, hydrateDataState, migrateSnapshot, serializeDataState } from "../src/data/persistence";
import { LOCAL_OWNER_ID } from "../src/types";

async function run() {
  const adapter = new InMemoryPersistenceAdapter();
  assert.equal(await adapter.load(), null);
  assert.equal(await adapter.hasData(), false);

  const initialState = createInitialState();
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

  assert.throws(() => migrateSnapshot({ schemaVersion: 999, savedAt: snapshot.savedAt, data: {} }));

  await adapter.clear();
  assert.equal(await adapter.load(), null);
}

run()
  .then(() => console.log("Persistence unit tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
