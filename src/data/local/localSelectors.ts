import type { ClientId, ExerciseId, PreviousExercisePerformance, QuickValueMetric, SessionId, WorkoutId } from "../types";
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

export function selectCompletedSessionsByClient(state: LocalDataState, clientId?: ClientId) {
  if (!clientId) return [];

  return state.sessionIds
    .map((id) => state.sessionsById[id])
    .filter((session) => session.clientId === clientId && session.status === "completed" && Boolean(session.completedAt))
    .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime())
    .map(cloneSession);
}

export function selectPreviousExercisePerformance(
  state: LocalDataState,
  input: { clientId?: ClientId; exerciseId?: ExerciseId; before?: string; excludeSessionId?: SessionId }
): PreviousExercisePerformance | null {
  if (!input.clientId || !input.exerciseId) return null;

  const beforeTime = input.before ? new Date(input.before).getTime() : Date.now();
  const sessions = state.sessionIds
    .map((id) => state.sessionsById[id])
    .filter((session) => {
      if (session.id === input.excludeSessionId) return false;
      if (session.clientId !== input.clientId || session.status !== "completed" || !session.completedAt) return false;
      return new Date(session.completedAt).getTime() < beforeTime;
    })
    .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime());

  for (const session of sessions) {
    const sets = state.resultIds
      .map((id) => state.resultsById[id])
      .filter((result) => result.sessionId === session.id && result.exerciseId === input.exerciseId && result.completed)
      .sort((left, right) => left.setIndex - right.setIndex)
      .map((result) => ({
        setIndex: result.setIndex,
        weight: result.weight,
        repetitions: result.repetitions,
        unit: result.unit
      }));

    if (sets.length > 0 && session.completedAt) {
      return {
        sessionId: session.id,
        completedAt: session.completedAt,
        sets
      };
    }
  }

  return null;
}

export function selectQuickValue(state: LocalDataState, input: { exerciseId?: ExerciseId; metric?: QuickValueMetric; clientId?: ClientId }) {
  if (!input.exerciseId || !input.metric) return null;

  const quickValue = state.quickValueIds
    .map((id) => state.quickValuesById[id])
    .find((item) => item.exerciseId === input.exerciseId && item.metric === input.metric && item.clientId === input.clientId);

  return quickValue ? cloneQuickValue(quickValue) : null;
}
