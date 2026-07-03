import type { ClientId, ExerciseId, OwnerId, PreviousExercisePerformance, QuickValueMetric, SessionId, WorkoutId, WorkoutResult, WorkoutResultType, WorkoutSession } from "../types";
import { getLegacyValues, normalizeTrackingType } from "@/features/workouts/tracking";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout, type LocalDataState } from "./localState";

function isOwned<T extends { ownerId: OwnerId }>(item: T | undefined, ownerId: OwnerId): item is T {
  return Boolean(item && item.ownerId === ownerId);
}

const defaultResultType: WorkoutResultType = "weight_reps";

function getResultSessionExercise(session: WorkoutSession | undefined, result: WorkoutResult) {
  return session?.exercises.find((exercise) => {
    if (result.sessionExerciseItemId) return exercise.id === result.sessionExerciseItemId;
    return exercise.exerciseId === result.exerciseId;
  });
}

function getResultType(session: WorkoutSession | undefined, result: WorkoutResult): WorkoutResultType {
  return result.resultType ?? getResultSessionExercise(session, result)?.resultTypeSnapshot ?? defaultResultType;
}

function getResultExerciseName(session: WorkoutSession | undefined, result: WorkoutResult) {
  const sessionExercise = getResultSessionExercise(session, result);
  return result.exerciseNameSnapshot ?? sessionExercise?.exerciseNameSnapshot ?? sessionExercise?.exerciseName ?? "";
}

export function selectClients(state: LocalDataState, ownerId: OwnerId) {
  return state.clientIds.map((id) => state.clientsById[id]).filter((client) => isOwned(client, ownerId)).map(cloneClient);
}

export function selectClientById(state: LocalDataState, id: ClientId | undefined, ownerId: OwnerId) {
  const client = id ? state.clientsById[id] : undefined;
  return isOwned(client, ownerId) ? cloneClient(client) : null;
}

export function selectExercises(state: LocalDataState, ownerId: OwnerId) {
  return state.exerciseIds
    .map((id) => state.exercisesById[id])
    .filter((exercise) => isOwned(exercise, ownerId) && !exercise.archivedAt)
    .map(cloneExercise);
}

export function selectExerciseById(state: LocalDataState, id: ExerciseId | undefined, ownerId: OwnerId) {
  const exercise = id ? state.exercisesById[id] : undefined;
  return isOwned(exercise, ownerId) ? cloneExercise(exercise) : null;
}

export function selectWorkouts(state: LocalDataState, ownerId: OwnerId) {
  return state.workoutIds.map((id) => state.workoutsById[id]).filter((workout) => isOwned(workout, ownerId)).map(cloneWorkout);
}

export function selectWorkoutById(state: LocalDataState, id: WorkoutId | undefined, ownerId: OwnerId) {
  const workout = id ? state.workoutsById[id] : undefined;
  return isOwned(workout, ownerId) ? cloneWorkout(workout) : null;
}

export function selectLatestWorkoutDraft(state: LocalDataState, ownerId: OwnerId) {
  const draft = state.workoutIds
    .map((id) => state.workoutsById[id])
    .filter((workout) => workout.ownerId === ownerId && workout.status === "draft")
    .sort((left, right) => new Date(right.updatedAt ?? right.createdAt ?? right.startsAt).getTime() - new Date(left.updatedAt ?? left.createdAt ?? left.startsAt).getTime())[0];

  return draft ? cloneWorkout(draft) : null;
}

export function selectSessions(state: LocalDataState, ownerId: OwnerId) {
  return state.sessionIds.map((id) => state.sessionsById[id]).filter((session) => isOwned(session, ownerId)).map(cloneSession);
}

export function selectSessionById(state: LocalDataState, id: SessionId | undefined, ownerId: OwnerId) {
  const session = id ? state.sessionsById[id] : undefined;
  return isOwned(session, ownerId) ? cloneSession(session) : null;
}

export function selectActiveSession(state: LocalDataState, ownerId: OwnerId) {
  const session = state.sessionIds.map((id) => state.sessionsById[id]).find((item) => item.ownerId === ownerId && item.status === "active");
  return session ? cloneSession(session) : null;
}

export function selectActiveSessionForWorkout(state: LocalDataState, ownerId: OwnerId, workoutId: WorkoutId | undefined) {
  if (!workoutId) return null;
  const session = state.sessionIds
    .map((id) => state.sessionsById[id])
    .find((item) => item.ownerId === ownerId && item.workoutId === workoutId && item.status === "active");
  return session ? cloneSession(session) : null;
}

export function selectActiveSessionConflict(state: LocalDataState, ownerId: OwnerId, workoutId: WorkoutId | undefined) {
  if (!workoutId || selectActiveSessionForWorkout(state, ownerId, workoutId)) return null;
  return selectActiveSession(state, ownerId);
}

export function selectResultsBySession(state: LocalDataState, sessionId: SessionId | undefined, ownerId: OwnerId) {
  if (!sessionId) return [];
  const session = state.sessionsById[sessionId];
  if (!isOwned(session, ownerId)) return [];
  return state.resultIds
    .map((id) => state.resultsById[id])
    .filter((result) => result.sessionId === sessionId && result.ownerId === ownerId)
    .map(cloneResult);
}

export function selectCompletedSessionsByClient(state: LocalDataState, clientId: ClientId | undefined, ownerId: OwnerId) {
  if (!clientId) return [];
  const client = state.clientsById[clientId];
  if (!isOwned(client, ownerId)) return [];

  return state.sessionIds
    .map((id) => state.sessionsById[id])
    .filter((session) => session.ownerId === ownerId && session.clientId === clientId && session.status === "completed" && Boolean(session.completedAt))
    .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime())
    .map(cloneSession);
}

export function selectPreviousExercisePerformance(
  state: LocalDataState,
  input: { ownerId: OwnerId; clientId?: ClientId; exerciseId?: ExerciseId; resultType?: WorkoutResultType; before?: string; excludeSessionId?: SessionId }
): PreviousExercisePerformance | null {
  if (!input.clientId || !input.exerciseId) return null;
  const client = state.clientsById[input.clientId];
  const exercise = state.exercisesById[input.exerciseId];
  if (!isOwned(client, input.ownerId) || !isOwned(exercise, input.ownerId)) return null;

  const beforeTime = input.before ? new Date(input.before).getTime() : Date.now();
  const sessions = state.sessionIds
    .map((id) => state.sessionsById[id])
    .filter((session) => {
      if (session.id === input.excludeSessionId) return false;
      if (session.ownerId !== input.ownerId || session.clientId !== input.clientId || session.status !== "completed" || !session.completedAt) return false;
      return new Date(session.completedAt).getTime() < beforeTime;
    })
    .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime());

  for (const session of sessions) {
    const sets = state.resultIds
      .map((id) => state.resultsById[id])
      .filter((result) => {
        if (result.ownerId !== input.ownerId || result.sessionId !== session.id || result.exerciseId !== input.exerciseId || !result.completed) return false;
        return input.resultType ? normalizeTrackingType(getResultType(session, result)) === normalizeTrackingType(input.resultType) : true;
      })
      .sort((left, right) => left.setIndex - right.setIndex)
      .map((result) => ({
        setIndex: result.setIndex,
        resultType: getResultType(session, result),
        values: getLegacyValues({
          values: result.values,
          weight: result.weight,
          repetitions: result.repetitions,
          durationSeconds: result.durationSeconds,
          distanceMeters: result.distanceMeters
        }),
        weight: result.weight,
        repetitions: result.repetitions,
        durationSeconds: result.durationSeconds,
        distanceMeters: result.distanceMeters,
        unit: result.unit
      }));

    if (sets.length > 0 && session.completedAt) {
      const firstResult = state.resultIds.map((id) => state.resultsById[id]).find((result) => result.sessionId === session.id && result.exerciseId === input.exerciseId);

      return {
        sessionId: session.id,
        completedAt: session.completedAt,
        resultType: sets[0]?.resultType ?? input.resultType ?? defaultResultType,
        exerciseName: firstResult ? getResultExerciseName(session, firstResult) : "",
        sets
      };
    }
  }

  return null;
}

export function selectQuickValue(state: LocalDataState, input: { ownerId: OwnerId; exerciseId?: ExerciseId; metric?: QuickValueMetric; clientId?: ClientId }) {
  if (!input.exerciseId || !input.metric) return null;
  const exercise = state.exercisesById[input.exerciseId];
  const client = input.clientId ? state.clientsById[input.clientId] : undefined;
  if (!isOwned(exercise, input.ownerId) || (input.clientId && !isOwned(client, input.ownerId))) return null;

  const quickValue = state.quickValueIds
    .map((id) => state.quickValuesById[id])
    .find((item) => item.ownerId === input.ownerId && item.exerciseId === input.exerciseId && item.metric === input.metric && item.clientId === input.clientId);

  return quickValue ? cloneQuickValue(quickValue) : null;
}
