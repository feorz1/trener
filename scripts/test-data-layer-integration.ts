import assert from "node:assert/strict";
import { localReducer } from "../src/data/local/localReducer";
import {
  selectClientById,
  selectClients,
  selectExerciseById,
  selectExercises,
  selectQuickValue,
  selectResultsBySession,
  selectSessionById,
  selectSessions,
  selectWorkoutById,
  selectWorkouts
} from "../src/data/local/localSelectors";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { hydrateDataState, serializeDataState } from "../src/data/persistence";
import { LOCAL_OWNER_ID, type OwnerId, type QuickValue, type Workout, type WorkoutResult, type WorkoutSession } from "../src/data/types";

const seed = createInitialState();
const clientId = seed.clientIds[0];
const exerciseId = seed.exerciseIds[0];

const draft: Workout = {
  id: "workout-integration-draft",
  ownerId: LOCAL_OWNER_ID,
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
  ownerId: LOCAL_OWNER_ID,
  workoutId: draft.id,
  clientId,
  status: "active",
  startedAt: "2026-06-19T10:45:00.000Z",
  exercises: [{ id: "session-exercise-integration", exerciseId, exerciseName: seed.exercisesById[exerciseId].name, order: 1 }]
};

const result: WorkoutResult = {
  id: "result-integration",
  ownerId: LOCAL_OWNER_ID,
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

const otherOwnerId = "other-trainer" as OwnerId;
const otherClient = {
  ...seed.clientsById[clientId],
  id: "client-other-owner",
  ownerId: otherOwnerId,
  name: "Other owner client"
};
const otherExercise = {
  ...seed.exercisesById[exerciseId],
  id: "exercise-other-owner",
  ownerId: otherOwnerId,
  name: "Other owner exercise"
};
const otherWorkout: Workout = {
  ...draft,
  id: "workout-other-owner",
  ownerId: otherOwnerId,
  clientId: otherClient.id,
  exercises: [{ ...draft.exercises[0], exerciseId: otherExercise.id }]
};
const otherSession: WorkoutSession = {
  ...session,
  id: "session-other-owner",
  ownerId: otherOwnerId,
  workoutId: otherWorkout.id,
  clientId: otherClient.id,
  exercises: [{ ...session.exercises[0], exerciseId: otherExercise.id }]
};
const otherResult: WorkoutResult = {
  ...result,
  id: "result-other-owner",
  ownerId: otherOwnerId,
  sessionId: otherSession.id,
  exerciseId: otherExercise.id
};
const otherQuickValue: QuickValue = {
  id: "quick-value-other-owner",
  ownerId: otherOwnerId,
  exerciseId: otherExercise.id,
  clientId: otherClient.id,
  metric: "weight",
  values: [42],
  updatedAt: "2026-06-19T10:45:00.000Z"
};
const mixedOwnerState = [
  { type: "client/upsert" as const, client: otherClient },
  { type: "exercise/upsert" as const, exercise: otherExercise },
  { type: "workout/upsert" as const, workout: otherWorkout },
  { type: "session/upsert" as const, session: otherSession },
  { type: "result/upsert" as const, result: otherResult },
  { type: "quickValue/upsert" as const, quickValue: otherQuickValue }
].reduce(localReducer, stateWithResult);

assert.equal(selectClientById(mixedOwnerState, otherClient.id, LOCAL_OWNER_ID), null);
assert.equal(selectExerciseById(mixedOwnerState, otherExercise.id, LOCAL_OWNER_ID), null);
assert.equal(selectWorkoutById(mixedOwnerState, otherWorkout.id, LOCAL_OWNER_ID), null);
assert.equal(selectSessionById(mixedOwnerState, otherSession.id, LOCAL_OWNER_ID), null);
assert.deepEqual(selectResultsBySession(mixedOwnerState, otherSession.id, LOCAL_OWNER_ID), []);
assert.equal(selectQuickValue(mixedOwnerState, { ownerId: LOCAL_OWNER_ID, exerciseId: otherExercise.id, metric: "weight", clientId: otherClient.id }), null);
assert.ok(selectClients(mixedOwnerState, LOCAL_OWNER_ID).every((client) => client.ownerId === LOCAL_OWNER_ID));
assert.ok(selectExercises(mixedOwnerState, LOCAL_OWNER_ID).every((exercise) => exercise.ownerId === LOCAL_OWNER_ID));
assert.ok(selectWorkouts(mixedOwnerState, LOCAL_OWNER_ID).every((workout) => workout.ownerId === LOCAL_OWNER_ID));
assert.ok(selectSessions(mixedOwnerState, LOCAL_OWNER_ID).every((item) => item.ownerId === LOCAL_OWNER_ID));
assert.equal(selectClientById(mixedOwnerState, otherClient.id, otherOwnerId)?.id, otherClient.id);
assert.equal(selectWorkoutById(mixedOwnerState, otherWorkout.id, otherOwnerId)?.id, otherWorkout.id);
assert.equal(selectResultsBySession(mixedOwnerState, otherSession.id, otherOwnerId).length, 1);

const legacyQuickValue: QuickValue = {
  id: `quick-value:${clientId}:${exerciseId}:weight`,
  ownerId: LOCAL_OWNER_ID,
  exerciseId,
  clientId,
  metric: "weight",
  values: [10],
  updatedAt: "2026-06-19T10:45:00.000Z"
};
const canonicalQuickValue: QuickValue = {
  ...legacyQuickValue,
  id: `quick-value:${LOCAL_OWNER_ID}:${clientId}:${exerciseId}:weight`,
  values: [12],
  updatedAt: "2026-06-19T10:50:00.000Z"
};
const stateWithLegacyQuickValue = localReducer(seed, { type: "quickValue/upsert", quickValue: legacyQuickValue });
const stateWithCanonicalQuickValue = localReducer(stateWithLegacyQuickValue, { type: "quickValue/upsert", quickValue: canonicalQuickValue });
assert.equal(stateWithCanonicalQuickValue.quickValueIds.includes(legacyQuickValue.id), false);
assert.equal(stateWithCanonicalQuickValue.quickValueIds.filter((id) => id === canonicalQuickValue.id).length, 1);
assert.deepEqual(selectQuickValue(stateWithCanonicalQuickValue, { ownerId: LOCAL_OWNER_ID, exerciseId, metric: "weight", clientId })?.values, [12]);

console.log("Data layer integration tests passed.");
