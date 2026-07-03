import type { Client, ClientId, Exercise, ExerciseId, QuickValue, QuickValueId, ResultId, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutResultType, WorkoutSession, WorkoutSessionExercise } from "../types";
import type { LocalDataState } from "./localState";

export type LocalDataAction =
  | { type: "state/replace"; state: LocalDataState }
  | { type: "client/upsert"; client: Client }
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

function isSameQuickValueScope(left: QuickValue, right: QuickValue) {
  return left.ownerId === right.ownerId && left.exerciseId === right.exerciseId && left.metric === right.metric && left.clientId === right.clientId;
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

    return {
      ...state,
      resultsById: { ...state.resultsById, [result.id]: result },
      resultIds: appendUnique<ResultId>(state.resultIds, result.id)
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
