import { mockClients } from "@/data/mockClients";
import { mockWorkouts } from "@/data/mockWorkouts";
import { cloneClient, cloneWorkout, type LocalDataState } from "../local/localState";
import { createProductionState } from "./productionSeed";

export function createInitialState(): LocalDataState {
  const productionState = createProductionState();
  const clients = mockClients.map(cloneClient);
  const workouts = mockWorkouts.map(cloneWorkout);

  return {
    ...productionState,
    clientsById: Object.fromEntries(clients.map((client) => [client.id, client])),
    clientIds: clients.map((client) => client.id),
    workoutsById: Object.fromEntries(workouts.map((workout) => [workout.id, workout])),
    workoutIds: workouts.map((workout) => workout.id)
  };
}
