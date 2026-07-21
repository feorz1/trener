import assert from "node:assert/strict";
import { ActiveSessionConflictError, DataError, createDataMutationGuard, getDataQueryState, toDataError } from "../src/data/contracts";
import { localReducer } from "../src/data/local/localReducer";
import { cloneClient } from "../src/data/local/localState";
import {
  selectActiveSession,
  selectActiveSessionConflict,
  selectActiveSessionForWorkout,
  selectClientById,
  selectClients,
  selectExerciseById,
  selectExercises,
  selectLatestWorkoutDraft,
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
import { assertUniqueActiveExerciseName, getNormalizedExerciseName } from "../src/data/local/exerciseValidation";
import { buildWorkoutResultFromSet, buildWorkoutResultFromUpsertInput } from "../src/data/local/resultBuilders";
import { getSessionTotalVolume, formatResultSet } from "../src/features/workouts/sessionHistory";
import { summarizeWorkoutResult } from "../src/features/workouts/sessionResult";
import { LOCAL_OWNER_ID, type OwnerId, type QuickValue, type Workout, type WorkoutResult, type WorkoutResultType, type WorkoutSession } from "../src/data/types";

const seed = createInitialState();
const clientId = seed.clientIds[0];
const exerciseId = seed.exerciseIds[0];

const profiledClient = {
  ...seed.clientsById[clientId],
  id: "client-profile-integration",
  restrictions: ["Без осевых нагрузок"],
  intake: {
    healthConstraints: ["Травмы спины"],
    exerciseRestrictions: ["Без осевых нагрузок"],
    sports: ["Футбол"],
    sleep: "6-8 часов"
  }
};
const clonedProfiledClient = cloneClient(profiledClient);
clonedProfiledClient.intake?.healthConstraints?.push("Проблемы с коленями");
clonedProfiledClient.intake?.exerciseRestrictions?.push("Без прыжков");
clonedProfiledClient.intake?.sports?.push("Плавание");
assert.deepEqual(profiledClient.intake.healthConstraints, ["Травмы спины"]);
assert.deepEqual(profiledClient.intake.exerciseRestrictions, ["Без осевых нагрузок"]);
assert.deepEqual(profiledClient.intake.sports, ["Футбол"]);

const stateWithProfiledClient = localReducer(seed, { type: "client/upsert", client: profiledClient });
const hydratedProfiledClientState = hydrateDataState(serializeDataState(stateWithProfiledClient));
assert.deepEqual(hydratedProfiledClientState.clientsById[profiledClient.id].intake, profiledClient.intake);
assert.deepEqual(hydratedProfiledClientState.clientsById[profiledClient.id].restrictions, profiledClient.restrictions);

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

const alternateDraft: Workout = {
  ...draft,
  id: "workout-integration-alternate",
  title: "Integration alternate",
  startsAt: "2026-06-19T12:30:00.000Z",
  exercises: [{ ...draft.exercises[0], id: "workout-exercise-integration-alternate" }]
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

const timezoneSession: WorkoutSession = {
  ...session,
  id: "session-timezone-policy",
  startedTimezone: "Europe/Moscow",
  completedAt: "2026-06-19T11:45:00.000Z",
  completedTimezone: "Europe/Moscow",
  status: "completed",
  durationSeconds: 3600
};
const timezoneState = localReducer(stateWithDraft, { type: "session/upsert", session: timezoneSession });
const timezoneHydrated = hydrateDataState(serializeDataState(timezoneState));
assert.equal(timezoneHydrated.sessionsById[timezoneSession.id].startedAt, timezoneSession.startedAt);
assert.equal(timezoneHydrated.sessionsById[timezoneSession.id].startedTimezone, "Europe/Moscow");
assert.equal(timezoneHydrated.sessionsById[timezoneSession.id].completedAt, timezoneSession.completedAt);
assert.equal(timezoneHydrated.sessionsById[timezoneSession.id].completedTimezone, "Europe/Moscow");

const completedResult = { ...result, completed: true };
const completedState = localReducer(stateWithSession, { type: "result/upsert", result: completedResult });
const completedHydrated = hydrateDataState(serializeDataState(completedState));
assert.equal(completedHydrated.resultIds.filter((id) => id === result.id).length, 1);
assert.equal(completedHydrated.resultsById[result.id].completed, true);

const replacedResult = {
  ...result,
  id: "result-integration-replaced",
  weight: 24,
  repetitions: 9
};
const replacedState = localReducer(stateWithResult, { type: "result/upsert", result: replacedResult });
assert.equal(replacedState.resultsById[result.id], undefined);
assert.equal(replacedState.resultIds.includes(result.id), false);
assert.equal(replacedState.resultsById[replacedResult.id].weight, 24);
assert.equal(replacedState.resultsById[replacedResult.id].repetitions, 9);

const stateWithAlternateDraft = localReducer(stateWithSession, { type: "workout/upsert", workout: alternateDraft });
assert.equal(selectActiveSession(stateWithAlternateDraft, LOCAL_OWNER_ID)?.id, session.id);
assert.equal(selectActiveSessionForWorkout(stateWithAlternateDraft, LOCAL_OWNER_ID, draft.id)?.id, session.id);
assert.equal(selectActiveSessionConflict(stateWithAlternateDraft, LOCAL_OWNER_ID, draft.id), null);
assert.equal(selectActiveSessionConflict(stateWithAlternateDraft, LOCAL_OWNER_ID, alternateDraft.id)?.id, session.id);
assert.equal(selectLatestWorkoutDraft(stateWithAlternateDraft, LOCAL_OWNER_ID)?.id, alternateDraft.id);
const stateAfterDraftDiscard = localReducer(stateWithAlternateDraft, { type: "workout/remove", workoutId: alternateDraft.id });
assert.equal(selectLatestWorkoutDraft(stateAfterDraftDiscard, LOCAL_OWNER_ID)?.id, draft.id);

const clientScopedQuickValue: QuickValue = {
  id: "quick-value-client-remove",
  ownerId: LOCAL_OWNER_ID,
  exerciseId,
  clientId,
  metric: "weight",
  values: [20],
  updatedAt: "2026-06-19T10:45:00.000Z"
};
const stateBeforeClientRemove = localReducer(stateWithResult, { type: "quickValue/upsert", quickValue: clientScopedQuickValue });
const stateAfterClientRemove = localReducer(stateBeforeClientRemove, { type: "client/remove", clientId });
assert.equal(selectClientById(stateAfterClientRemove, clientId, LOCAL_OWNER_ID), null);
assert.equal(selectWorkoutById(stateAfterClientRemove, draft.id, LOCAL_OWNER_ID), null);
assert.equal(selectSessionById(stateAfterClientRemove, session.id, LOCAL_OWNER_ID), null);
assert.deepEqual(selectResultsBySession(stateAfterClientRemove, session.id, LOCAL_OWNER_ID), []);
assert.equal(selectQuickValue(stateAfterClientRemove, { ownerId: LOCAL_OWNER_ID, exerciseId, metric: "weight", clientId }), null);

const conflict = new ActiveSessionConflictError(selectActiveSessionConflict(stateWithAlternateDraft, LOCAL_OWNER_ID, alternateDraft.id)!);
assert.equal(conflict.name, "ActiveSessionConflictError");
assert.equal(conflict.activeSession.id, session.id);
assert.equal(conflict.activeSession.workoutId, draft.id);

const stateAfterRepeatedActiveUpsert = localReducer(stateWithSession, { type: "session/upsert", session: { ...session, updatedAt: "2026-06-19T10:50:00.000Z" } });
assert.equal(stateAfterRepeatedActiveUpsert.sessionIds.filter((id) => id === session.id).length, 1);
assert.equal(selectActiveSessionForWorkout(stateAfterRepeatedActiveUpsert, LOCAL_OWNER_ID, draft.id)?.id, session.id);

const completedSession: WorkoutSession = {
  ...session,
  status: "completed",
  completedAt: "2026-06-19T11:45:00.000Z",
  durationSeconds: 3600,
  updatedAt: "2026-06-19T11:45:00.000Z"
};
const stateCompletedOnce = localReducer(stateWithDraft, { type: "session/upsert", session: completedSession });
const stateCompletedTwice = localReducer(stateCompletedOnce, { type: "session/upsert", session: completedSession });
assert.equal(stateCompletedTwice.sessionIds.filter((id) => id === completedSession.id).length, 1);
assert.equal(stateCompletedTwice.sessionsById[completedSession.id].status, "completed");
assert.equal(stateCompletedTwice.sessionsById[completedSession.id].completedAt, completedSession.completedAt);
assert.equal(selectActiveSessionConflict(stateCompletedTwice, LOCAL_OWNER_ID, alternateDraft.id), null);

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

const customExercise = {
  ...seed.exercisesById[exerciseId],
  id: "exercise-custom-duplicate",
  name: "  Авторская   тяга  ",
  source: "custom" as const,
  createdAt: "2026-06-19T09:00:00.000Z",
  updatedAt: "2026-06-19T09:00:00.000Z"
};
const stateWithCustomExercise = localReducer(seed, { type: "exercise/upsert", exercise: customExercise });
assert.equal(getNormalizedExerciseName(customExercise.name), "авторская тяга");
assert.throws(
  () => assertUniqueActiveExerciseName(stateWithCustomExercise, { ownerId: LOCAL_OWNER_ID, name: "авторская тяга" }),
  (error) => error instanceof DataError && error.code === "validation"
);
assert.doesNotThrow(() => assertUniqueActiveExerciseName(stateWithCustomExercise, { ownerId: LOCAL_OWNER_ID, name: "авторская тяга", excludeExerciseId: customExercise.id }));
const stateWithArchivedCustomExercise = localReducer(stateWithCustomExercise, {
  type: "exercise/upsert",
  exercise: { ...customExercise, archivedAt: "2026-06-19T10:00:00.000Z" }
});
assert.equal(selectExercises(stateWithArchivedCustomExercise, LOCAL_OWNER_ID).some((exercise) => exercise.id === customExercise.id), false);
assert.doesNotThrow(() => assertUniqueActiveExerciseName(stateWithArchivedCustomExercise, { ownerId: LOCAL_OWNER_ID, name: "Авторская тяга" }));
assert.doesNotThrow(() => assertUniqueActiveExerciseName(stateWithCustomExercise, { ownerId: otherOwnerId, name: "Авторская тяга" }));

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

const pikeExerciseId = "pike-push-up";
const pikeWorkout: Workout = {
  ...draft,
  id: "workout-hydrate-result-type",
  exercises: [
    {
      id: "workout-exercise-pike",
      exerciseId: pikeExerciseId,
      exerciseName: "Отжимания уголком",
      order: 1,
      sets: [{ id: "set-pike", order: 1, targetReps: 12, completed: false }]
    }
  ]
};
const pikeSession: WorkoutSession = {
  ...session,
  id: "session-hydrate-result-type",
  workoutId: pikeWorkout.id,
  exercises: [{ id: "session-exercise-pike", exerciseId: pikeExerciseId, exerciseName: "Отжимания уголком", order: 1 }]
};
const pikeResult: WorkoutResult = {
  id: "result-hydrate-result-type",
  ownerId: LOCAL_OWNER_ID,
  sessionId: pikeSession.id,
  sessionExerciseItemId: "session-exercise-pike",
  exerciseId: pikeExerciseId,
  setIndex: 1,
  repetitions: 12,
  completed: true
};
const hydratedPikeState = hydrateDataState(serializeDataState([
  { type: "workout/upsert" as const, workout: pikeWorkout },
  { type: "session/upsert" as const, session: pikeSession },
  { type: "result/upsert" as const, result: pikeResult }
].reduce(localReducer, seed)));

assert.equal(hydratedPikeState.workoutsById[pikeWorkout.id].exercises[0].resultType, "reps_only");
assert.equal(hydratedPikeState.sessionsById[pikeSession.id].exercises[0].resultTypeSnapshot, "reps_only");
assert.equal(hydratedPikeState.resultsById[pikeResult.id].resultType, "reps_only");

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
assert.equal(formatResultSet({ resultType: "reps", repetitions: 18 }), "18");
assert.equal(formatResultSet({ resultType: "duration", durationSeconds: 75 }), "1:15");
assert.equal(formatResultSet({ resultType: "distance_duration", distanceMeters: 400, durationSeconds: 120 }), "400м·2:00");

async function runAsyncStatePrimitiveTests() {
  const retryCalls: string[] = [];
  const loadingQueryState = getDataQueryState({
    hydrationStatus: "loading",
    hydrationError: null,
    retryHydration: () => retryCalls.push("loading")
  });
  assert.equal(loadingQueryState.isLoading, true);
  assert.equal(loadingQueryState.error, null);
  loadingQueryState.retry();
  assert.deepEqual(retryCalls, ["loading"]);

  const hydrationFailure = new Error("Hydration failed");
  const errorQueryState = getDataQueryState({
    hydrationStatus: "error",
    hydrationError: hydrationFailure,
    retryHydration: () => retryCalls.push("error")
  });
  assert.equal(errorQueryState.isLoading, false);
  assert.equal(errorQueryState.error?.code, "unknown");
  assert.equal(errorQueryState.error?.retryable, true);
  errorQueryState.refetch();
  assert.deepEqual(retryCalls, ["loading", "error"]);

  const notFoundDataError = toDataError(new DataError("not_found", "Missing", { retryable: false }));
  assert.equal(notFoundDataError.code, "not_found");
  assert.equal(notFoundDataError.retryable, false);

  let mutationRuns = 0;
  const guardedMutation = createDataMutationGuard(async (value: string) => {
    mutationRuns += 1;
    await Promise.resolve();
    return `saved:${value}`;
  });
  const firstMutation = guardedMutation.run("first");
  const duplicateMutation = guardedMutation.run("second");
  assert.equal(firstMutation.started, true);
  assert.equal(duplicateMutation.started, false);
  assert.equal(firstMutation.promise, duplicateMutation.promise);
  assert.equal(guardedMutation.isSubmitting(), true);
  assert.equal(await firstMutation.promise, "saved:first");
  assert.equal(guardedMutation.isSubmitting(), false);
  assert.equal(mutationRuns, 1);
  const nextMutation = guardedMutation.run("third");
  assert.equal(nextMutation.started, true);
  assert.equal(await nextMutation.promise, "saved:third");
  assert.equal(mutationRuns, 2);
}

runAsyncStatePrimitiveTests()
  .then(() => console.log("Data layer integration tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
