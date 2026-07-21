import { createProductionState } from "../seeds/productionSeed";
import type { LocalDataState } from "../local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "../local/localState";
import { LOCAL_OWNER_ID, type Exercise, type OwnerId, type Workout, type WorkoutResult, type WorkoutResultType, type WorkoutSession } from "../types";
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

function normalizeExerciseName(name: string | undefined) {
  return name?.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU") ?? "";
}

function getExerciseResultType(
  exerciseById: Record<string, Exercise>,
  exerciseId: string | undefined,
  exerciseName: string | undefined
): WorkoutResultType | undefined {
  const exercise = exerciseId ? exerciseById[exerciseId] : undefined;
  if (exercise?.resultType) return exercise.resultType;

  const normalizedName = normalizeExerciseName(exerciseName);
  return Object.values(exerciseById).find((item) => normalizeExerciseName(item.name) === normalizedName)?.resultType;
}

function preferResolvedResultType(current: WorkoutResultType | undefined, resolved: WorkoutResultType | undefined) {
  if (!current) return resolved;
  if (current === "weight_reps" && resolved && resolved !== "weight_reps") return resolved;
  return current;
}

function enrichWorkoutResultTypes(workout: Workout, exerciseById: Record<string, Exercise>): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const resolvedResultType = getExerciseResultType(exerciseById, exercise.exerciseId, exercise.exerciseName);
      return {
        ...exercise,
        resultType: preferResolvedResultType(exercise.resultType, resolvedResultType),
        sets: exercise.sets.map((set) => ({ ...set }))
      };
    })
  };
}

function enrichSessionResultTypes(
  session: WorkoutSession,
  workoutsById: Record<string, Workout>,
  exerciseById: Record<string, Exercise>
): WorkoutSession {
  const workout = workoutsById[session.workoutId];
  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      const workoutExercise = workout?.exercises.find((item) => item.exerciseId === exercise.exerciseId || item.id === exercise.id);
      const resolvedResultType =
        workoutExercise?.resultType ??
        getExerciseResultType(exerciseById, exercise.exerciseId, exercise.exerciseNameSnapshot ?? exercise.exerciseName);
      return {
        ...exercise,
        resultTypeSnapshot: preferResolvedResultType(exercise.resultTypeSnapshot, resolvedResultType)
      };
    })
  };
}

function enrichResultTypes(
  result: WorkoutResult,
  sessionsById: Record<string, WorkoutSession>,
  workoutsById: Record<string, Workout>,
  exerciseById: Record<string, Exercise>
): WorkoutResult {
  const session = sessionsById[result.sessionId];
  const sessionExercise = session?.exercises.find((exercise) => {
    if (result.sessionExerciseItemId) return exercise.id === result.sessionExerciseItemId;
    return exercise.exerciseId === result.exerciseId;
  });
  const workout = session ? workoutsById[session.workoutId] : undefined;
  const workoutExercise = workout?.exercises.find((exercise) => exercise.exerciseId === result.exerciseId || exercise.id === sessionExercise?.id);
  const resolvedResultType =
    sessionExercise?.resultTypeSnapshot ??
    workoutExercise?.resultType ??
    getExerciseResultType(exerciseById, result.exerciseId, result.exerciseNameSnapshot ?? sessionExercise?.exerciseNameSnapshot ?? sessionExercise?.exerciseName);

  return {
    ...result,
    resultType: preferResolvedResultType(result.resultType, resolvedResultType)
  };
}

export function hydrateDataState(snapshot: PersistedSnapshot): LocalDataState {
  const seed = createProductionState();
  const clients = snapshot.data.clients.map((client) => withOwner(cloneClient(client)));
  const persistedExercises = (snapshot.data.exercises ?? []).map((exercise) => withOwner(cloneExercise(exercise)));
  const exerciseById = {
    ...seed.exercisesById,
    ...Object.fromEntries(persistedExercises.map((exercise) => [exercise.id, mergeSeedExercise(seed.exercisesById[exercise.id], exercise)]))
  };
  const exerciseIds = Array.from(new Set([...seed.exerciseIds, ...persistedExercises.map((exercise) => exercise.id)]));
  const workouts = snapshot.data.workouts.map((workout) => withOwner(enrichWorkoutResultTypes(cloneWorkout(workout), exerciseById)));
  const workoutsById = Object.fromEntries(workouts.map((workout) => [workout.id, workout]));
  const sessions = snapshot.data.sessions.map((session) => withOwner(enrichSessionResultTypes(cloneSession(session), workoutsById, exerciseById)));
  const sessionsById = Object.fromEntries(sessions.map((session) => [session.id, session]));
  const results = snapshot.data.results.map((result) => withOwner(enrichResultTypes(cloneResult(result), sessionsById, workoutsById, exerciseById)));
  const quickValues = snapshot.data.quickValues.map((quickValue) => withOwner(cloneQuickValue(quickValue)));

  return {
    clientsById: Object.fromEntries(clients.map((client) => [client.id, client])),
    clientIds: clients.map((client) => client.id),
    exercisesById: exerciseById,
    exerciseIds,
    workoutsById,
    workoutIds: workouts.map((workout) => workout.id),
    sessionsById,
    sessionIds: sessions.map((session) => session.id),
    resultsById: Object.fromEntries(results.map((result) => [result.id, result])),
    resultIds: results.map((result) => result.id),
    quickValuesById: Object.fromEntries(quickValues.map((quickValue) => [quickValue.id, quickValue])),
    quickValueIds: quickValues.map((quickValue) => quickValue.id)
  };
}
