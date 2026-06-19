import assert from "node:assert/strict";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { InMemoryPersistenceAdapter, CURRENT_SCHEMA_VERSION, hydrateDataState, migrateSnapshot, serializeDataState } from "../src/data/persistence";

async function run() {
  const adapter = new InMemoryPersistenceAdapter();
  assert.equal(await adapter.load(), null);
  assert.equal(await adapter.hasData(), false);

  const initialState = createInitialState();
  const snapshot = serializeDataState(initialState, "2026-06-19T10:30:00.000Z");
  assert.equal(snapshot.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(snapshot.savedAt, "2026-06-19T10:30:00.000Z");

  await adapter.save(snapshot);
  assert.equal(await adapter.hasData(), true);
  const loadedSnapshot = migrateSnapshot(await adapter.load());
  assert.equal(loadedSnapshot.schemaVersion, snapshot.schemaVersion);
  assert.deepEqual(loadedSnapshot.data.clients.map((client) => client.id), snapshot.data.clients.map((client) => client.id));
  assert.deepEqual(loadedSnapshot.data.workouts.map((workout) => workout.id), snapshot.data.workouts.map((workout) => workout.id));

  const hydrated = hydrateDataState(loadedSnapshot);
  assert.deepEqual(hydrated.clientIds, initialState.clientIds);
  assert.deepEqual(hydrated.workoutIds, initialState.workoutIds);

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
