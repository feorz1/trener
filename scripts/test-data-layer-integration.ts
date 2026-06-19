import assert from "node:assert/strict";
import { localReducer } from "../src/data/local/localReducer";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { hydrateDataState, serializeDataState } from "../src/data/persistence";
import type { Workout, WorkoutResult, WorkoutSession } from "../src/data/types";

const seed = createInitialState();
const clientId = seed.clientIds[0];
const exerciseId = seed.exerciseIds[0];

const draft: Workout = {
  id: "workout-integration-draft",
  clientId,
  title: "Integration draft",
  startsAt: "2026-06-19T10:30:00.000Z",
  durationMinutes: 60,
  focus: "",
  location: "Зал",
  status: "draft",
  repeatDays: ["monday"],
  scheduleTimes: { monday: "17:00" },
  exercises: [
    {
      id: "workout-exercise-integration",
      exerciseId,
      exerciseName: seed.exercisesById[exerciseId].name,
      day: "monday",
      order: 1,
      sets: [{ id: "set-integration", order: 1, targetWeightKg: 20, targetReps: 10, completed: false }]
    }
  ]
};

const session: WorkoutSession = {
  id: "session-integration",
  workoutId: draft.id,
  clientId,
  status: "active",
  startedAt: "2026-06-19T10:45:00.000Z",
  exercises: [{ id: "session-exercise-integration", exerciseId, exerciseName: seed.exercisesById[exerciseId].name, order: 1 }]
};

const result: WorkoutResult = {
  id: "result-integration",
  sessionId: session.id,
  exerciseId,
  setIndex: 1,
  setId: "set-integration",
  weight: 22,
  repetitions: 8,
  unit: "кг",
  completed: false
};

const stateWithDraft = localReducer(seed, { type: "workout/upsert", workout: draft });
const stateWithSession = localReducer(stateWithDraft, { type: "session/upsert", session });
const stateWithResult = localReducer(stateWithSession, { type: "result/upsert", result });
const hydrated = hydrateDataState(serializeDataState(stateWithResult));

assert.equal(hydrated.workoutsById[draft.id].id, draft.id);
assert.equal(hydrated.workoutsById[draft.id].exercises[0].id, "workout-exercise-integration");
assert.equal(hydrated.workoutsById[draft.id].exercises[0].day, "monday");
assert.equal(hydrated.sessionsById[session.id].status, "active");
assert.equal(hydrated.resultsById[result.id].completed, false);
assert.equal(hydrated.resultsById[result.id].weight, 22);

const completedResult = { ...result, completed: true };
const completedState = localReducer(stateWithSession, { type: "result/upsert", result: completedResult });
const completedHydrated = hydrateDataState(serializeDataState(completedState));
assert.equal(completedHydrated.resultIds.filter((id) => id === result.id).length, 1);
assert.equal(completedHydrated.resultsById[result.id].completed, true);

console.log("Data layer integration tests passed.");
