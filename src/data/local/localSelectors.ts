import type { ClientId, ExerciseId, QuickValueMetric, SessionId, WorkoutId } from "../types";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout, type LocalDataState } from "./localState";

export function selectClients(state: LocalDataState) {
  return state.clientIds.map((id) => cloneClient(state.clientsById[id])).filter(Boolean);
}

export function selectClientById(state: LocalDataState, id?: ClientId) {
  return id ? state.clientsById[id] ?? null : null;
}

export function selectExercises(state: LocalDataState) {
  return state.exerciseIds.map((id) => cloneExercise(state.exercisesById[id])).filter(Boolean);
}

export function selectExerciseById(state: LocalDataState, id?: ExerciseId) {
  return id ? state.exercisesById[id] ?? null : null;
}

export function selectWorkouts(state: LocalDataState) {
  return state.workoutIds.map((id) => cloneWorkout(state.workoutsById[id])).filter(Boolean);
}

export function selectWorkoutById(state: LocalDataState, id?: WorkoutId) {
  return id ? state.workoutsById[id] ?? null : null;
}

export function selectSessions(state: LocalDataState) {
  return state.sessionIds.map((id) => cloneSession(state.sessionsById[id])).filter(Boolean);
}

export function selectSessionById(state: LocalDataState, id?: SessionId) {
  return id ? state.sessionsById[id] ?? null : null;
}

export function selectResultsBySession(state: LocalDataState, sessionId?: SessionId) {
  if (!sessionId) return [];
  return state.resultIds
    .map((id) => state.resultsById[id])
    .filter((result) => result.sessionId === sessionId)
    .map(cloneResult);
}

export function selectQuickValue(state: LocalDataState, input: { exerciseId?: ExerciseId; metric?: QuickValueMetric; clientId?: ClientId }) {
  if (!input.exerciseId || !input.metric) return null;

  const quickValue = state.quickValueIds
    .map((id) => state.quickValuesById[id])
    .find((item) => item.exerciseId === input.exerciseId && item.metric === input.metric && item.clientId === input.clientId);

  return quickValue ? cloneQuickValue(quickValue) : null;
}
