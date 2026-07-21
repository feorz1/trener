import assert from "node:assert/strict";
import { mergeSessionExercises, normalizeSessionSetIndexes, type SessionExercise } from "../src/features/workouts/sessionExerciseMerge";

const localExercise: SessionExercise = {
  id: "session-exercise-1",
  exerciseId: "exercise-cobra",
  exerciseName: "Кобра лежа удержание",
  resultType: "weight_reps",
  sets: [
    { id: "planned-set-1", index: 1, resultType: "weight_reps", values: { weight: 1, reps: 2 }, weight: 1, reps: 2, state: "default", logged: true },
    { id: "planned-set-2", index: 2, resultType: "weight_reps", values: { weight: 1, reps: 2 }, weight: 1, reps: 2, state: "default", logged: true },
    { id: "local-added-set-3", index: 3, resultType: "weight_reps", values: { weight: 1 }, weight: 1, state: "default", logged: true }
  ]
};

const remoteResultExercise: SessionExercise = {
  ...localExercise,
  sets: [
    { id: "remote-result-1", index: 1, resultType: "weight_reps", values: { weight: 1, reps: 20 }, weight: 1, reps: 20, state: "default", logged: true }
  ]
};

const merged = mergeSessionExercises([localExercise], [remoteResultExercise]);

assert.equal(merged.length, 1);
assert.deepEqual(
  merged[0]?.sets.map((set) => set.id),
  ["planned-set-1", "planned-set-2", "local-added-set-3"],
  "remote result for set #1 should update the local planned set without replacing the row id"
);
assert.equal(
  merged[0]?.sets[0]?.reps,
  20,
  "remote result values should still update the matching local row"
);
assert.deepEqual(
  merged[0]?.sets.map((set) => set.index),
  [1, 2, 3],
  "merged set indexes should stay normalized"
);

const repeatedMerge = mergeSessionExercises(merged, [remoteResultExercise]);
assert.equal(repeatedMerge[0]?.sets.length, 3, "repeated remote updates should not keep adding the same set");
assert.equal(repeatedMerge[0]?.sets[0]?.id, "planned-set-1", "repeated remote updates should keep the visible row id stable");

const localOnlyExercise: SessionExercise = {
  id: "session-exercise-local-only",
  exerciseId: "exercise-local-only",
  exerciseName: "Новое упражнение",
  resultType: "reps_only",
  sets: [{ id: "local-only-set-1", index: 1, resultType: "reps_only", values: { reps: 10 }, reps: 10, state: "default", logged: true }]
};
const mergeWithLocalOnlyExercise = mergeSessionExercises([localExercise, localOnlyExercise], [remoteResultExercise]);
assert.equal(
  mergeWithLocalOnlyExercise.some((exercise) => exercise.id === localOnlyExercise.id),
  true,
  "local session exercises that are not in the incoming snapshot yet should stay visible after result refreshes"
);

const remoteAddedSetExercise: SessionExercise = {
  ...localExercise,
  sets: [
    { id: "remote-result-3", index: 3, resultType: "weight_reps", values: { weight: 1, reps: 12 }, weight: 1, reps: 12, state: "default", logged: true }
  ]
};
const addedSetMerge = mergeSessionExercises([localExercise], [remoteAddedSetExercise]);
assert.equal(
  addedSetMerge[0]?.sets[2]?.id,
  "local-added-set-3",
  "first server response for a locally added set should not remount the focused input row"
);
assert.equal(addedSetMerge[0]?.sets[2]?.reps, 12);

const normalizedDuplicateSets = normalizeSessionSetIndexes([
  { id: "remote-result-1-old", index: 1, state: "default" as const },
  { id: "remote-result-1", index: 1, state: "default" as const },
  { id: "remote-result-2", index: 2, state: "default" as const }
]);

assert.deepEqual(
  normalizedDuplicateSets.map((set) => set.id),
  ["remote-result-1", "remote-result-2"],
  "duplicate set indexes from remote results should collapse to one visible row"
);
assert.deepEqual(
  normalizedDuplicateSets.map((set) => set.index),
  [1, 2],
  "deduped set indexes should stay contiguous"
);

console.log("Session exercise merge tests passed.");
