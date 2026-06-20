import { createInitialState } from "../seeds/mockSeed";
import type { LocalDataState } from "../local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "../local/localState";
import type { PersistedSnapshot } from "./PersistedSnapshot";

function getLatestId<T extends { id: string }>(items: T[]) {
  return items[items.length - 1]?.id ?? null;
}

export function serializeDataState(state: LocalDataState, savedAt = new Date().toISOString()): PersistedSnapshot {
  const sessions = state.sessionIds.map((id) => cloneSession(state.sessionsById[id]));
  const workouts = state.workoutIds.map((id) => cloneWorkout(state.workoutsById[id]));

  return {
    schemaVersion: 1,
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

export function hydrateDataState(snapshot: PersistedSnapshot): LocalDataState {
  const seed = createInitialState();
  const clients = snapshot.data.clients.map(cloneClient);
  const persistedExercises = (snapshot.data.exercises ?? []).map(cloneExercise);
  const exerciseById = {
    ...seed.exercisesById,
    ...Object.fromEntries(persistedExercises.map((exercise) => [exercise.id, exercise]))
  };
  const exerciseIds = Array.from(new Set([...seed.exerciseIds, ...persistedExercises.map((exercise) => exercise.id)]));
  const workouts = snapshot.data.workouts.map(cloneWorkout);
  const sessions = snapshot.data.sessions.map(cloneSession);
  const results = snapshot.data.results.map(cloneResult);
  const quickValues = snapshot.data.quickValues.map(cloneQuickValue);

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
