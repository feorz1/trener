import type { LocalDataState } from "../local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "../local/localState";
import type { OwnerId } from "../types";

type OwnedEntity = {
  id: string;
  ownerId: OwnerId;
};

function collectOwnedInOrder<T extends OwnedEntity>(
  ids: readonly string[],
  byId: Record<string, T>,
  ownerId: OwnerId,
  clone: (entity: T) => T
) {
  const seen = new Set<string>();
  const entities: T[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    const entity = byId[id];
    if (!entity || entity.ownerId !== ownerId) continue;
    seen.add(id);
    entities.push(clone(entity));
  }

  return entities;
}

function recordById<T extends { id: string }>(entities: readonly T[]) {
  return Object.fromEntries(entities.map((entity) => [entity.id, entity])) as Record<string, T>;
}

/**
 * Applies a full server bootstrap without discarding owner-scoped data that has
 * no server representation. Server-backed collections always come from the
 * remote snapshot; only valid local drafts and quick values are carried over.
 */
export function mergeOwnerBootstrapState(
  localState: LocalDataState,
  remoteState: LocalDataState,
  ownerId: OwnerId
): LocalDataState {
  const clients = collectOwnedInOrder(remoteState.clientIds, remoteState.clientsById, ownerId, cloneClient);
  const exercises = collectOwnedInOrder(remoteState.exerciseIds, remoteState.exercisesById, ownerId, cloneExercise);
  const remoteWorkouts = collectOwnedInOrder(remoteState.workoutIds, remoteState.workoutsById, ownerId, cloneWorkout);
  const sessions = collectOwnedInOrder(remoteState.sessionIds, remoteState.sessionsById, ownerId, cloneSession);
  const results = collectOwnedInOrder(remoteState.resultIds, remoteState.resultsById, ownerId, cloneResult);

  const clientIds = new Set(clients.map((client) => client.id));
  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const remoteWorkoutIds = new Set(remoteWorkouts.map((workout) => workout.id));

  const drafts = collectOwnedInOrder(localState.workoutIds, localState.workoutsById, ownerId, cloneWorkout)
    .filter((workout) => workout.status === "draft")
    .filter((workout) => !remoteWorkoutIds.has(workout.id))
    .filter((workout) => !workout.clientId || clientIds.has(workout.clientId))
    .filter((workout) => workout.exercises.every((exercise) => exerciseIds.has(exercise.exerciseId)));

  const quickValues = collectOwnedInOrder(localState.quickValueIds, localState.quickValuesById, ownerId, cloneQuickValue)
    .filter((quickValue) => !quickValue.clientId || clientIds.has(quickValue.clientId))
    .filter((quickValue) => exerciseIds.has(quickValue.exerciseId));

  const workouts = [...remoteWorkouts, ...drafts];

  return {
    clientsById: recordById(clients),
    clientIds: clients.map((client) => client.id),
    exercisesById: recordById(exercises),
    exerciseIds: exercises.map((exercise) => exercise.id),
    workoutsById: recordById(workouts),
    workoutIds: workouts.map((workout) => workout.id),
    sessionsById: recordById(sessions),
    sessionIds: sessions.map((session) => session.id),
    resultsById: recordById(results),
    resultIds: results.map((result) => result.id),
    quickValuesById: recordById(quickValues),
    quickValueIds: quickValues.map((quickValue) => quickValue.id)
  };
}
