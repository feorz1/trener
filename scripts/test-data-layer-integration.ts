import assert from "node:assert/strict";
import { localReducer } from "../src/data/local/localReducer";
import {
  selectClientById,
  selectClients,
  selectExerciseById,
  selectExercises,
  selectPreviousExercisePerformance,
  selectQuickValue,
  selectResultsBySession,
  selectSessionById,
  selectSessions,
  selectWorkoutById,
  selectWorkouts
} from "../src/data/local/localSelectors";
import { createInitialState } from "../src/data/seeds/mockSeed";
import { hydrateDataState, serializeDataState } from "../src/data/persistence";
import { buildWorkoutResultFromSet, buildWorkoutResultFromUpsertInput } from "../src/data/local/resultBuilders";
import { getSessionTotalVolume, formatResultSet } from "../src/features/workouts/sessionHistory";
import { summarizeWorkoutResult } from "../src/features/workouts/sessionResult";
import { LOCAL_OWNER_ID, type OwnerId, type QuickValue, type Workout, type WorkoutResult, type WorkoutResultType, type WorkoutSession } from "../src/data/types";

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

const durationQuickValue: QuickValue = {
  id: `quick-value:${LOCAL_OWNER_ID}:${clientId}:${exerciseId}:duration`,
  ownerId: LOCAL_OWNER_ID,
  exerciseId,
  clientId,
  metric: "duration",
  values: [75, 90],
  updatedAt: "2026-06-19T10:55:00.000Z"
};
const distanceQuickValue: QuickValue = {
  id: `quick-value:${LOCAL_OWNER_ID}:${clientId}:${exerciseId}:distance`,
  ownerId: LOCAL_OWNER_ID,
  exerciseId,
  clientId,
  metric: "distance",
  values: [400, 500],
  updatedAt: "2026-06-19T10:56:00.000Z"
};
const stateWithResultTypeQuickValues = [
  { type: "quickValue/upsert" as const, quickValue: durationQuickValue },
  { type: "quickValue/upsert" as const, quickValue: distanceQuickValue }
].reduce(localReducer, stateWithCanonicalQuickValue);
const hydratedResultTypeQuickValues = hydrateDataState(serializeDataState(stateWithResultTypeQuickValues));

assert.deepEqual(selectQuickValue(hydratedResultTypeQuickValues, { ownerId: LOCAL_OWNER_ID, exerciseId, metric: "duration", clientId })?.values, [75, 90]);
assert.deepEqual(selectQuickValue(hydratedResultTypeQuickValues, { ownerId: LOCAL_OWNER_ID, exerciseId, metric: "distance", clientId })?.values, [400, 500]);

const snapshotWorkout: Workout = {
  ...draft,
  id: "workout-result-type-snapshot",
  exercises: [
    {
      ...draft.exercises[0],
      exerciseName: "Original duration exercise",
      resultType: "duration",
      sets: [{ id: "duration-target", order: 1, targetDurationSeconds: 90, completed: false }]
    }
  ]
};
const unsnapshottedSession: WorkoutSession = {
  ...session,
  id: "session-result-type-snapshot",
  workoutId: snapshotWorkout.id,
  exercises: [{ id: "session-exercise-duration", exerciseId, exerciseName: "Original duration exercise", order: 1 }]
};
const stateWithSnapshotSession = [
  { type: "workout/upsert" as const, workout: snapshotWorkout },
  { type: "session/upsert" as const, session: unsnapshottedSession }
].reduce(localReducer, seed);

assert.equal(stateWithSnapshotSession.sessionsById[unsnapshottedSession.id].exercises[0].exerciseNameSnapshot, "Original duration exercise");
assert.equal(stateWithSnapshotSession.sessionsById[unsnapshottedSession.id].exercises[0].resultTypeSnapshot, "duration");

const renamedExercise = { ...seed.exercisesById[exerciseId], name: "Renamed after session", archivedAt: "2026-06-19T11:00:00.000Z" };
const stateAfterRename = localReducer(stateWithSnapshotSession, { type: "exercise/upsert", exercise: renamedExercise });
const stateAfterSnapshotRefresh = localReducer(stateAfterRename, {
  type: "session/upsert",
  session: {
    ...stateAfterRename.sessionsById[unsnapshottedSession.id],
    exercises: [{ ...stateAfterRename.sessionsById[unsnapshottedSession.id].exercises[0], exerciseName: "Renamed after session" }]
  }
});
const snapshotResult = localReducer(stateAfterSnapshotRefresh, {
  type: "result/upsert",
  result: {
    id: "result-snapshot-duration",
    ownerId: LOCAL_OWNER_ID,
    sessionId: unsnapshottedSession.id,
    sessionExerciseItemId: "session-exercise-duration",
    exerciseId,
    setIndex: 1,
    durationSeconds: 90,
    completed: true
  }
}).resultsById["result-snapshot-duration"];

assert.equal(stateAfterSnapshotRefresh.sessionsById[unsnapshottedSession.id].exercises[0].exerciseNameSnapshot, "Original duration exercise");
assert.equal(stateAfterSnapshotRefresh.sessionsById[unsnapshottedSession.id].exercises[0].resultTypeSnapshot, "duration");
assert.equal(snapshotResult.exerciseNameSnapshot, "Original duration exercise");
assert.equal(snapshotResult.resultType, "duration");

const dataProviderStartResult = buildWorkoutResultFromSet({
  id: "result-data-provider-start-distance-duration",
  ownerId: LOCAL_OWNER_ID,
  sessionId: unsnapshottedSession.id,
  sessionExerciseItemId: "session-exercise-duration",
  exercise: {
    ...snapshotWorkout.exercises[0],
    resultType: "distance_duration",
    sets: [{ id: "distance-duration-target", order: 1, targetDistanceMeters: 500, targetDurationSeconds: 180, completed: false }]
  },
  set: { id: "distance-duration-target", order: 1, targetDistanceMeters: 500, targetDurationSeconds: 180, completed: false }
});

assert.equal(dataProviderStartResult.exerciseNameSnapshot, "Original duration exercise");
assert.equal(dataProviderStartResult.resultType, "distance_duration");
assert.equal(dataProviderStartResult.distanceMeters, 500);
assert.equal(dataProviderStartResult.durationSeconds, 180);

const dataProviderUpsertResult = buildWorkoutResultFromUpsertInput({
  id: dataProviderStartResult.id,
  ownerId: LOCAL_OWNER_ID,
  existing: dataProviderStartResult,
  upsert: {
    sessionId: dataProviderStartResult.sessionId,
    sessionExerciseItemId: dataProviderStartResult.sessionExerciseItemId,
    exerciseId,
    exerciseNameSnapshot: dataProviderStartResult.exerciseNameSnapshot,
    resultType: "distance_duration",
    setIndex: 1,
    setId: dataProviderStartResult.setId,
    distanceMeters: 650,
    durationSeconds: 165,
    completed: true
  }
});

assert.equal(dataProviderUpsertResult.id, dataProviderStartResult.id);
assert.equal(dataProviderUpsertResult.resultType, "distance_duration");
assert.equal(dataProviderUpsertResult.exerciseNameSnapshot, "Original duration exercise");
assert.equal(dataProviderUpsertResult.distanceMeters, 650);
assert.equal(dataProviderUpsertResult.durationSeconds, 165);

function buildCompletedResultState(
  currentState: typeof seed,
  input: {
    id: string;
    resultType: WorkoutResultType;
    completedAt: string;
    result: Partial<WorkoutResult>;
  }
) {
  const completedSession: WorkoutSession = {
    id: `session-${input.id}`,
    ownerId: LOCAL_OWNER_ID,
    workoutId: draft.id,
    clientId,
    status: "completed",
    startedAt: input.completedAt,
    completedAt: input.completedAt,
    exercises: [
      {
        id: `session-exercise-${input.id}`,
        exerciseId,
        exerciseName: `Snapshot ${input.resultType}`,
        exerciseNameSnapshot: `Snapshot ${input.resultType}`,
        resultTypeSnapshot: input.resultType,
        order: 1
      }
    ]
  };
  const completedWorkoutResult: WorkoutResult = {
    id: `result-${input.id}`,
    ownerId: LOCAL_OWNER_ID,
    sessionId: completedSession.id,
    sessionExerciseItemId: completedSession.exercises[0].id,
    exerciseId,
    setIndex: 1,
    unit: "кг",
    completed: true,
    ...input.result
  };

  return [
    { type: "session/upsert" as const, session: completedSession },
    { type: "result/upsert" as const, result: completedWorkoutResult }
  ].reduce(localReducer, currentState);
}

const resultTypeHistoryState = [
  {
    id: "weight-reps",
    resultType: "weight_reps" as const,
    completedAt: "2026-06-19T09:00:00.000Z",
    result: { weight: 20, repetitions: 10 }
  },
  {
    id: "reps",
    resultType: "reps" as const,
    completedAt: "2026-06-19T10:00:00.000Z",
    result: { repetitions: 18 }
  },
  {
    id: "duration",
    resultType: "duration" as const,
    completedAt: "2026-06-19T11:00:00.000Z",
    result: { durationSeconds: 75 }
  },
  {
    id: "distance-duration",
    resultType: "distance_duration" as const,
    completedAt: "2026-06-19T12:00:00.000Z",
    result: { distanceMeters: 400, durationSeconds: 120 }
  }
].reduce(buildCompletedResultState, stateWithDraft);

assert.equal(
  selectPreviousExercisePerformance(resultTypeHistoryState, { ownerId: LOCAL_OWNER_ID, clientId, exerciseId, resultType: "weight_reps" })?.sets[0].weight,
  20
);
assert.equal(
  selectPreviousExercisePerformance(resultTypeHistoryState, { ownerId: LOCAL_OWNER_ID, clientId, exerciseId, resultType: "reps" })?.sets[0].repetitions,
  18
);
assert.equal(
  selectPreviousExercisePerformance(resultTypeHistoryState, { ownerId: LOCAL_OWNER_ID, clientId, exerciseId, resultType: "duration" })?.sets[0].durationSeconds,
  75
);
assert.equal(
  selectPreviousExercisePerformance(resultTypeHistoryState, { ownerId: LOCAL_OWNER_ID, clientId, exerciseId, resultType: "distance_duration" })?.sets[0].distanceMeters,
  400
);
assert.equal(
  selectPreviousExercisePerformance(resultTypeHistoryState, { ownerId: LOCAL_OWNER_ID, clientId, exerciseId })?.resultType,
  "distance_duration"
);

const resultTypeSummary = summarizeWorkoutResult({
  workoutId: "workout-result-types",
  clientName: "Result Types",
  durationSeconds: 1800,
  exercises: [
    {
      id: "summary-weight",
      exerciseId,
      exerciseName: "Weight reps",
      sets: [{ id: "summary-weight-set", index: 1, resultType: "weight_reps", weight: 20, reps: 10, unit: "кг", state: "selected" }]
    },
    {
      id: "summary-reps",
      exerciseId,
      exerciseName: "Reps",
      sets: [{ id: "summary-reps-set", index: 1, resultType: "reps", reps: 18, state: "selected" }]
    },
    {
      id: "summary-duration",
      exerciseId,
      exerciseName: "Duration",
      sets: [{ id: "summary-duration-set", index: 1, resultType: "duration", durationSeconds: 75, state: "selected" }]
    },
    {
      id: "summary-distance-duration",
      exerciseId,
      exerciseName: "Distance duration",
      sets: [{ id: "summary-distance-duration-set", index: 1, resultType: "distance_duration", distanceMeters: 400, durationSeconds: 120, state: "selected" }]
    }
  ]
});
const resultTypeResults = Object.values(resultTypeHistoryState.resultsById).filter((item) => item.sessionId.startsWith("session-"));

assert.equal(resultTypeSummary.loggedExercises, 4);
assert.equal(resultTypeSummary.loggedSets, 4);
assert.equal(resultTypeSummary.totalVolumeKg, 200);
assert.equal(getSessionTotalVolume(resultTypeResults), 200);
assert.equal(formatResultSet({ resultType: "reps", repetitions: 18 }), "18 повт.");
assert.equal(formatResultSet({ resultType: "duration", durationSeconds: 75 }), "01:15");
assert.equal(formatResultSet({ resultType: "distance_duration", distanceMeters: 400, durationSeconds: 120 }), "400 м × 02:00");

console.log("Data layer integration tests passed.");
