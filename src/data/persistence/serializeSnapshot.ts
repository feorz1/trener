import { createInitialState } from "../seeds/mockSeed";
import type { LocalDataState } from "../local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "../local/localState";
import { LOCAL_OWNER_ID, type Exercise, type OwnerId } from "../types";
import { CURRENT_SCHEMA_VERSION, type PersistedSnapshot } from "./PersistedSnapshot";

function getLatestId<T extends { id: string }>(items: T[]) {
  return items[items.length - 1]?.id ?? null;
}

export function serializeDataState(state: LocalDataState, savedAt = new Date().toISOString()): PersistedSnapshot {
  const sessions = state.sessionIds.map((id) => cloneSession(state.sessionsById[id]));
  const workouts = state.workoutIds.map((id) => cloneWorkout(state.workoutsById[id]));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt,
    data: {
      clients: state.clientIds.map((id) => cloneClient(state.clientsById[id])),
      exercises: state.exerciseIds.map((id) => cloneExercise(state.exercisesById[id])),
      workouts,
      sessions,
      results: state.resultIds.map((id) => cloneResult(state.resultsById[id])),
      quickValues: state.quickValueIds.map((id) => cloneQuickValue(state.quickValuesById[id]))
    },
    meta: {
      activeSessionId: getLatestId(sessions.filter((session) => session.status === "active")),
      lastWorkoutDraftId: getLatestId(workouts.filter((workout) => workout.status === "draft"))
    }
  };
}

function withOwner<T extends { ownerId?: OwnerId }>(item: T): T & { ownerId: OwnerId } {
  return {
    ...item,
    ownerId: item.ownerId ?? LOCAL_OWNER_ID
  };
}

function mergeSeedExercise(seed: Exercise | undefined, persisted: Exercise): Exercise {
  if (!seed || persisted.source === "custom") return persisted;
  return {
    ...seed,
    ...persisted,
    source: persisted.source ?? seed.source,
    resultType: persisted.resultType ?? seed.resultType,
    searchAliases: persisted.searchAliases ?? seed.searchAliases,
    restrictionTags: persisted.restrictionTags ?? seed.restrictionTags
  };
}

export function hydrateDataState(snapshot: PersistedSnapshot): LocalDataState {
  const seed = createInitialState();
  const clients = snapshot.data.clients.map((client) => withOwner(cloneClient(client)));
  const persistedExercises = (snapshot.data.exercises ?? []).map((exercise) => withOwner(cloneExercise(exercise)));
  const exerciseById = {
    ...seed.exercisesById,
    ...Object.fromEntries(persistedExercises.map((exercise) => [exercise.id, mergeSeedExercise(seed.exercisesById[exercise.id], exercise)]))
  };
  const exerciseIds = Array.from(new Set([...seed.exerciseIds, ...persistedExercises.map((exercise) => exercise.id)]));
  const workouts = snapshot.data.workouts.map((workout) => withOwner(cloneWorkout(workout)));
  const sessions = snapshot.data.sessions.map((session) => withOwner(cloneSession(session)));
  const results = snapshot.data.results.map((result) => withOwner(cloneResult(result)));
  const quickValues = snapshot.data.quickValues.map((quickValue) => withOwner(cloneQuickValue(quickValue)));

  return {
    clientsById: Object.fromEntries(clients.map((client) => [client.id, client])),
    clientIds: clients.map((client) => client.id),
    exercisesById: exerciseById,
    exerciseIds,
    workoutsById: Object.fromEntries(workouts.map((workout) => [workout.id, workout])),
    workoutIds: workouts.map((workout) => workout.id),
    sessionsById: Object.fromEntries(sessions.map((session) => [session.id, session])),
    sessionIds: sessions.map((session) => session.id),
    resultsById: Object.fromEntries(results.map((result) => [result.id, result])),
    resultIds: results.map((result) => result.id),
    quickValuesById: Object.fromEntries(quickValues.map((quickValue) => [quickValue.id, quickValue])),
    quickValueIds: quickValues.map((quickValue) => quickValue.id)
  };
}
