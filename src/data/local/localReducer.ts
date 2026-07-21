import type { Client, ClientId, Exercise, ExerciseId, QuickValue, QuickValueId, ResultId, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutResultType, WorkoutSession, WorkoutSessionExercise } from "../types";
import type { LocalDataState } from "./localState";

export type LocalDataAction =
  | { type: "state/replace"; state: LocalDataState }
  | { type: "client/upsert"; client: Client }
  | { type: "client/remove"; clientId: ClientId }
  | { type: "exercise/upsert"; exercise: Exercise }
  | { type: "workout/upsert"; workout: Workout }
  | { type: "workout/remove"; workoutId: WorkoutId }
  | { type: "session/upsert"; session: WorkoutSession }
  | { type: "result/upsert"; result: WorkoutResult }
  | { type: "result/remove"; resultId: ResultId }
  | { type: "quickValue/upsert"; quickValue: QuickValue }
  | { type: "quickValue/remove"; quickValueId: QuickValueId };

function appendUnique<T extends string>(ids: T[], id: T) {
  return ids.includes(id) ? ids : [...ids, id];
}

function removeRecordIds<T>(record: Record<string, T>, ids: readonly string[]) {
  const next = { ...record };
  ids.forEach((id) => {
    delete next[id];
  });
  return next;
}

function isSameQuickValueScope(left: QuickValue, right: QuickValue) {
  return left.ownerId === right.ownerId && left.exerciseId === right.exerciseId && left.metric === right.metric && left.clientId === right.clientId;
}

function isSameResultSetScope(left: WorkoutResult, right: WorkoutResult) {
  if (left.ownerId !== right.ownerId || left.sessionId !== right.sessionId || left.setIndex !== right.setIndex) return false;
  if (left.sessionExerciseItemId || right.sessionExerciseItemId) return left.sessionExerciseItemId === right.sessionExerciseItemId;
  return left.exerciseId === right.exerciseId;
}

const defaultResultType: WorkoutResultType = "weight_reps";

function getWorkoutExercise(state: LocalDataState, session: WorkoutSession | undefined, exercise: Pick<WorkoutSessionExercise, "exerciseId">) {
  const workout = session ? state.workoutsById[session.workoutId] : undefined;
  return workout?.exercises.find((item) => item.exerciseId === exercise.exerciseId);
}

function getSessionExercise(state: LocalDataState, result: WorkoutResult) {
  const session = state.sessionsById[result.sessionId];
  const sessionExercise = session?.exercises.find((exercise) => {
    if (result.sessionExerciseItemId || exercise.id === result.sessionExerciseItemId) return exercise.id === result.sessionExerciseItemId;
    return exercise.exerciseId === result.exerciseId;
  });

  return { session, sessionExercise };
}

function enrichSession(state: LocalDataState, session: WorkoutSession): WorkoutSession {
  const existingSession = state.sessionsById[session.id];

  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      const existingExercise = existingSession?.exercises.find((item) => item.id === exercise.id || item.exerciseId === exercise.exerciseId);
      const workoutExercise = getWorkoutExercise(state, session, exercise);
      const exerciseRecord = state.exercisesById[exercise.exerciseId];

      return {
        ...exercise,
        exerciseNameSnapshot:
          exercise.exerciseNameSnapshot ??
          existingExercise?.exerciseNameSnapshot ??
          exercise.exerciseName ??
          workoutExercise?.exerciseName ??
          exerciseRecord?.name,
        resultTypeSnapshot: exercise.resultTypeSnapshot ?? existingExercise?.resultTypeSnapshot ?? workoutExercise?.resultType ?? defaultResultType
      };
    })
  };
}

function enrichResult(state: LocalDataState, result: WorkoutResult): WorkoutResult {
  const existingResult = state.resultsById[result.id];
  const { session, sessionExercise } = getSessionExercise(state, result);
  const workoutExercise = sessionExercise ? getWorkoutExercise(state, session, sessionExercise) : undefined;
  const exerciseRecord = state.exercisesById[result.exerciseId];

  return {
    ...result,
    exerciseNameSnapshot:
      result.exerciseNameSnapshot ??
      existingResult?.exerciseNameSnapshot ??
      sessionExercise?.exerciseNameSnapshot ??
      sessionExercise?.exerciseName ??
      workoutExercise?.exerciseName ??
      exerciseRecord?.name,
    resultType: result.resultType ?? existingResult?.resultType ?? sessionExercise?.resultTypeSnapshot ?? workoutExercise?.resultType ?? defaultResultType
  };
}

export function localReducer(state: LocalDataState, action: LocalDataAction): LocalDataState {
  if (action.type === "state/replace") {
    return action.state;
  }

  if (action.type === "client/upsert") {
    return {
      ...state,
      clientsById: { ...state.clientsById, [action.client.id]: action.client },
      clientIds: appendUnique<ClientId>(state.clientIds, action.client.id)
    };
  }

  if (action.type === "client/remove") {
    const removedWorkoutIds = state.workoutIds.filter((id) => state.workoutsById[id]?.clientId === action.clientId);
    const removedWorkoutIdSet = new Set<WorkoutId>(removedWorkoutIds);
    const removedSessionIds = state.sessionIds.filter((id) => {
      const session = state.sessionsById[id];
      return session?.clientId === action.clientId || removedWorkoutIdSet.has(session?.workoutId);
    });
    const removedSessionIdSet = new Set<SessionId>(removedSessionIds);
    const removedResultIds = state.resultIds.filter((id) => removedSessionIdSet.has(state.resultsById[id]?.sessionId));
    const removedQuickValueIds = state.quickValueIds.filter((id) => state.quickValuesById[id]?.clientId === action.clientId);

    return {
      ...state,
      clientsById: removeRecordIds(state.clientsById, [action.clientId]),
      clientIds: state.clientIds.filter((id) => id !== action.clientId),
      workoutsById: removeRecordIds(state.workoutsById, removedWorkoutIds),
      workoutIds: state.workoutIds.filter((id) => !removedWorkoutIdSet.has(id)),
      sessionsById: removeRecordIds(state.sessionsById, removedSessionIds),
      sessionIds: state.sessionIds.filter((id) => !removedSessionIdSet.has(id)),
      resultsById: removeRecordIds(state.resultsById, removedResultIds),
      resultIds: state.resultIds.filter((id) => !removedResultIds.includes(id)),
      quickValuesById: removeRecordIds(state.quickValuesById, removedQuickValueIds),
      quickValueIds: state.quickValueIds.filter((id) => !removedQuickValueIds.includes(id))
    };
  }

  if (action.type === "exercise/upsert") {
    return {
      ...state,
      exercisesById: { ...state.exercisesById, [action.exercise.id]: action.exercise },
      exerciseIds: appendUnique<ExerciseId>(state.exerciseIds, action.exercise.id)
    };
  }

  if (action.type === "workout/upsert") {
    return {
      ...state,
      workoutsById: { ...state.workoutsById, [action.workout.id]: action.workout },
      workoutIds: appendUnique<WorkoutId>(state.workoutIds, action.workout.id)
    };
  }

  if (action.type === "workout/remove") {
    const { [action.workoutId]: _removed, ...workoutsById } = state.workoutsById;
    return {
      ...state,
      workoutsById,
      workoutIds: state.workoutIds.filter((id) => id !== action.workoutId)
    };
  }

  if (action.type === "session/upsert") {
    const session = enrichSession(state, action.session);

    return {
      ...state,
      sessionsById: { ...state.sessionsById, [session.id]: session },
      sessionIds: appendUnique<SessionId>(state.sessionIds, session.id)
    };
  }

  if (action.type === "result/upsert") {
    const result = enrichResult(state, action.result);
    const removedIds = state.resultIds.filter((id) => {
      const existing = state.resultsById[id];
      return Boolean(existing && id !== result.id && isSameResultSetScope(existing, result));
    });
    const resultsById = { ...state.resultsById, [result.id]: result };
    for (const id of removedIds) {
      delete resultsById[id];
    }

    return {
      ...state,
      resultsById,
      resultIds: appendUnique<ResultId>(
        state.resultIds.filter((id) => !removedIds.includes(id)),
        result.id
      )
    };
  }

  if (action.type === "result/remove") {
    const { [action.resultId]: _removed, ...resultsById } = state.resultsById;
    return {
      ...state,
      resultsById,
      resultIds: state.resultIds.filter((id) => id !== action.resultId)
    };
  }

  if (action.type === "quickValue/upsert") {
    const removedIds = state.quickValueIds.filter((id) => isSameQuickValueScope(state.quickValuesById[id], action.quickValue) && id !== action.quickValue.id);
    const quickValuesById = { ...state.quickValuesById, [action.quickValue.id]: action.quickValue };
    for (const id of removedIds) {
      delete quickValuesById[id];
    }

    return {
      ...state,
      quickValuesById,
      quickValueIds: appendUnique<QuickValueId>(
        state.quickValueIds.filter((id) => !removedIds.includes(id)),
        action.quickValue.id
      )
    };
  }

  const { [action.quickValueId]: _removed, ...quickValuesById } = state.quickValuesById;
  return {
    ...state,
    quickValuesById,
    quickValueIds: state.quickValueIds.filter((id) => id !== action.quickValueId)
  };
}
