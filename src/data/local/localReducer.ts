import type { Client, ClientId, Exercise, ExerciseId, QuickValue, QuickValueId, ResultId, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutSession } from "../types";
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
    return {
      ...state,
      sessionsById: { ...state.sessionsById, [action.session.id]: action.session },
      sessionIds: appendUnique<SessionId>(state.sessionIds, action.session.id)
    };
  }

  if (action.type === "result/upsert") {
    return {
      ...state,
      resultsById: { ...state.resultsById, [action.result.id]: action.result },
      resultIds: appendUnique<ResultId>(state.resultIds, action.result.id)
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
    return {
      ...state,
      quickValuesById: { ...state.quickValuesById, [action.quickValue.id]: action.quickValue },
      quickValueIds: appendUnique<QuickValueId>(state.quickValueIds, action.quickValue.id)
    };
  }

  const { [action.quickValueId]: _removed, ...quickValuesById } = state.quickValuesById;
  return {
    ...state,
    quickValuesById,
    quickValueIds: state.quickValueIds.filter((id) => id !== action.quickValueId)
  };
}
