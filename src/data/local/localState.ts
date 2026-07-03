import type { Client, ClientId, Exercise, ExerciseId, QuickValue, QuickValueId, ResultId, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutSession } from "../types";

export type LocalDataState = {
  clientsById: Record<ClientId, Client>;
  clientIds: ClientId[];
  exercisesById: Record<ExerciseId, Exercise>;
  exerciseIds: ExerciseId[];
  workoutsById: Record<WorkoutId, Workout>;
  workoutIds: WorkoutId[];
  sessionsById: Record<SessionId, WorkoutSession>;
  sessionIds: SessionId[];
  resultsById: Record<ResultId, WorkoutResult>;
  resultIds: ResultId[];
  quickValuesById: Record<QuickValueId, QuickValue>;
  quickValueIds: QuickValueId[];
};

export function cloneClient(client: Client): Client {
  return {
    ...client,
    restrictions: client.restrictions ? [...client.restrictions] : undefined,
    metrics: { ...client.metrics }
  };
}

export function cloneExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: exercise.secondaryMuscles ? [...exercise.secondaryMuscles] : undefined,
    searchAliases: exercise.searchAliases ? [...exercise.searchAliases] : undefined,
    restrictionTags: exercise.restrictionTags ? [...exercise.restrictionTags] : undefined
  };
}

export function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    repeatDays: workout.repeatDays ? [...workout.repeatDays] : undefined,
    scheduleTimes: workout.scheduleTimes ? { ...workout.scheduleTimes } : undefined,
    exercises: workout.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set }))
    }))
  };
}

export function cloneSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({ ...exercise }))
  };
}

export function cloneResult(result: WorkoutResult): WorkoutResult {
  return { ...result };
}

export function cloneQuickValue(quickValue: QuickValue): QuickValue {
  return {
    ...quickValue,
    values: [...quickValue.values]
  };
}
