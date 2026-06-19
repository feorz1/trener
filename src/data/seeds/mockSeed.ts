import { mockClients } from "@/data/mockClients";
import { mockExercises } from "@/data/mockExercises";
import { mockWorkouts } from "@/data/mockWorkouts";
import { cloneClient, cloneExercise, cloneWorkout, type LocalDataState } from "../local/localState";

export function createInitialState(): LocalDataState {
  const clients = mockClients.map(cloneClient);
  const exercises = mockExercises.map(cloneExercise);
  const workouts = mockWorkouts.map(cloneWorkout);

  return {
    clientsById: Object.fromEntries(clients.map((client) => [client.id, client])),
    clientIds: clients.map((client) => client.id),
    exercisesById: Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])),
    exerciseIds: exercises.map((exercise) => exercise.id),
    workoutsById: Object.fromEntries(workouts.map((workout) => [workout.id, workout])),
    workoutIds: workouts.map((workout) => workout.id),
    sessionsById: {},
    sessionIds: [],
    resultsById: {},
    resultIds: [],
    quickValuesById: {},
    quickValueIds: []
  };
}
