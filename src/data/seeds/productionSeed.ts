import { mockExercises as builtInExercises } from "@/data/mockExercises";
import { cloneExercise, type LocalDataState } from "../local/localState";

export function createProductionState(): LocalDataState {
  const exercises = builtInExercises.map(cloneExercise);

  return {
    clientsById: {},
    clientIds: [],
    exercisesById: Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])),
    exerciseIds: exercises.map((exercise) => exercise.id),
    workoutsById: {},
    workoutIds: [],
    sessionsById: {},
    sessionIds: [],
    resultsById: {},
    resultIds: [],
    quickValuesById: {},
    quickValueIds: []
  };
}
