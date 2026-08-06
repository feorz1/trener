import assert from "node:assert/strict";
import type { DataApiWorkoutSession } from "../src/data/api/dataApi.types";
import { mapExercise, mapSession, mapWorkout } from "../src/data/remote/bootstrap";
import {
  exerciseToRemoteInput,
  exerciseToRemotePatch,
  sessionExercisesToRemoteItems,
  workoutToRemoteSessionInput
} from "../src/data/remote/workoutRoundtripCodec";
import type { Workout } from "../src/data/types";

const localWorkout: Workout = {
  id: "local-workout",
  ownerId: "trainer-a",
  clientId: "client-a",
  title: "Точная программа",
  startsAt: "2026-08-03T07:30:00.000Z",
  timezone: "Europe/Moscow",
  durationMinutes: 75,
  focus: "Сила и техника",
  location: "Зал на Тверской",
  status: "draft",
  repeatDays: ["monday", "wednesday"],
  scheduleTimes: { monday: "10:30", wednesday: "18:15" },
  exercises: [
    {
      id: "workout-exercise-a",
      exerciseId: "exercise-a",
      exerciseName: "Жим штанги",
      resultType: "weight_reps_rpe",
      order: 1,
      day: "monday",
      comment: "Контроль паузы",
      supersetWithNext: true,
      restSeconds: 90,
      sets: [
        {
          id: "set-a-1",
          order: 1,
          values: { weight: 80, reps: 8, rpe: 7.5 },
          targetWeightKg: 80,
          targetReps: 8,
          completed: false
        },
        {
          id: "set-a-2",
          order: 2,
          values: { weight: 85, reps: 6, rpe: 8 },
          targetWeightKg: 85,
          targetReps: 6,
          completed: false
        }
      ]
    },
    {
      id: "workout-exercise-b",
      exerciseId: "exercise-b",
      exerciseName: "Гребля",
      resultType: "distance_duration",
      order: 2,
      day: "wednesday",
      supersetWithNext: false,
      sets: [
        {
          id: "set-b-1",
          order: 1,
          values: { distance: 1_000, duration: 300 },
          targetDurationSeconds: 300,
          targetDistanceMeters: 1_000,
          completed: false
        }
      ]
    }
  ]
};

const remoteInput = workoutToRemoteSessionInput(localWorkout);
assert.deepEqual(
  {
    scheduledAt: remoteInput.scheduledAt,
    timezone: remoteInput.timezone,
    durationMinutes: remoteInput.durationMinutes,
    focus: remoteInput.focus,
    location: remoteInput.location,
    repeatDays: remoteInput.repeatDays,
    scheduleTimes: remoteInput.scheduleTimes,
    notes: remoteInput.notes
  },
  {
    scheduledAt: localWorkout.startsAt,
    timezone: "Europe/Moscow",
    durationMinutes: 75,
    focus: "Сила и техника",
    location: "Зал на Тверской",
    repeatDays: ["monday", "wednesday"],
    scheduleTimes: { monday: "10:30", wednesday: "18:15" },
    notes: "Сила и техника"
  }
);
assert.equal(remoteInput.items?.[0].plannedSets, 2);
assert.equal(remoteInput.items?.[0].plannedReps, 8);
assert.equal(remoteInput.items?.[0].plannedWeight, 80);
assert.equal(remoteInput.items?.[0].restSeconds, 90);
assert.deepEqual(remoteInput.items?.[0].plannedSetTargets, [
  {
    id: "set-a-1",
    order: 1,
    values: { weight: 80, reps: 8, rpe: 7.5 },
    targetWeightKg: 80,
    targetReps: 8,
    targetDurationSeconds: null,
    targetDistanceMeters: null
  },
  {
    id: "set-a-2",
    order: 2,
    values: { weight: 85, reps: 6, rpe: 8 },
    targetWeightKg: 85,
    targetReps: 6,
    targetDurationSeconds: null,
    targetDistanceMeters: null
  }
]);
assert.deepEqual(JSON.parse(JSON.stringify(remoteInput)).scheduleTimes, { monday: "10:30", wednesday: "18:15" });

const remoteSession: DataApiWorkoutSession = {
  ...remoteInput,
  id: "remote-session",
  title: remoteInput.title,
  status: "planned",
  items: (remoteInput.items ?? []).map((item, index) => ({
    ...item,
    id: `remote-item-${index + 1}`,
    titleSnapshot: item.titleSnapshot ?? `Exercise ${index + 1}`,
    ...(index === 0
      ? { setResults: [{ id: "actual-result-a-1", setNumber: 1, weight: 82.5, reps: 7, completed: true }] }
      : {})
  }))
};
const roundtripped = mapWorkout(remoteSession, "trainer-a");

assert.deepEqual(
  {
    timezone: roundtripped.timezone,
    durationMinutes: roundtripped.durationMinutes,
    focus: roundtripped.focus,
    location: roundtripped.location,
    repeatDays: roundtripped.repeatDays,
    scheduleTimes: roundtripped.scheduleTimes
  },
  {
    timezone: localWorkout.timezone,
    durationMinutes: localWorkout.durationMinutes,
    focus: localWorkout.focus,
    location: localWorkout.location,
    repeatDays: localWorkout.repeatDays,
    scheduleTimes: localWorkout.scheduleTimes
  }
);
assert.deepEqual(
  roundtripped.exercises.map(({ resultType, day, supersetWithNext, restSeconds }) => ({ resultType, day, supersetWithNext, restSeconds })),
  [
    { resultType: "weight_reps_rpe", day: "monday", supersetWithNext: true, restSeconds: 90 },
    { resultType: "distance_duration", day: "wednesday", supersetWithNext: false, restSeconds: undefined }
  ]
);
assert.deepEqual(roundtripped.exercises[0].sets.map(({ id, order, values, targetWeightKg, targetReps }) => ({ id, order, values, targetWeightKg, targetReps })), [
  { id: "set-a-1", order: 1, values: { weight: 80, reps: 8, rpe: 7.5 }, targetWeightKg: 80, targetReps: 8 },
  { id: "set-a-2", order: 2, values: { weight: 85, reps: 6, rpe: 8 }, targetWeightKg: 85, targetReps: 6 }
]);
assert.equal(roundtripped.exercises[0].sets[0].actualWeightKg, 82.5);
assert.equal(roundtripped.exercises[0].sets[0].actualReps, 7);
assert.equal(roundtripped.exercises[0].sets[0].completed, true);
assert.deepEqual(roundtripped.exercises[1].sets[0], {
  id: "set-b-1",
  order: 1,
  values: { distance: 1_000, duration: 300 },
  targetWeightKg: undefined,
  targetReps: undefined,
  targetDurationSeconds: 300,
  targetDistanceMeters: 1_000,
  actualWeightKg: undefined,
  actualReps: undefined,
  actualDurationSeconds: undefined,
  actualDistanceMeters: undefined,
  completed: false
});

const activeSession = mapSession({ ...remoteSession, status: "in_progress", startedAt: "2026-08-03T07:30:00.000Z" }, "trainer-a");
assert.ok(activeSession);
const activeItems = sessionExercisesToRemoteItems(activeSession.exercises);
assert.deepEqual(
  {
    day: activeItems[0].day,
    supersetWithNext: activeItems[0].supersetWithNext,
    plannedSetTargets: activeItems[0].plannedSetTargets,
    plannedDurationSec: activeItems[0].plannedDurationSec,
    restSeconds: activeItems[0].restSeconds
  },
  {
    day: "monday",
    supersetWithNext: true,
    plannedSetTargets: remoteInput.items?.[0].plannedSetTargets,
    plannedDurationSec: null,
    restSeconds: 90
  }
);

const legacyWorkout = mapWorkout(
  {
    id: "legacy-session",
    title: "Legacy",
    status: "planned",
    scheduledAt: "2026-08-04T08:00:00.000Z",
    notes: "Legacy focus",
    items: [
      {
        id: "legacy-item",
        exerciseId: "exercise-pike",
        order: 1,
        titleSnapshot: "Отжимания уголком",
        plannedSets: 2,
        plannedReps: 10,
        plannedWeight: null,
        plannedDurationSec: null
      }
    ]
  },
  "trainer-a"
);
assert.equal(legacyWorkout.durationMinutes, 60);
assert.equal(legacyWorkout.focus, "Legacy focus");
assert.equal(legacyWorkout.location, "Зал");
assert.equal(legacyWorkout.exercises[0].resultType, "reps_only");
assert.deepEqual(legacyWorkout.exercises[0].sets.map((set) => set.targetReps), [10, 10]);

const explicitMuscles = mapExercise(
  {
    id: "exercise-muscles",
    name: "Explicit muscles",
    muscleGroup: "legacy-ignored",
    primaryMuscles: [],
    secondaryMuscles: [],
    resultType: "completion_only"
  },
  "trainer-a"
);
assert.deepEqual(explicitMuscles.primaryMuscles, []);
assert.deepEqual(explicitMuscles.secondaryMuscles, []);
assert.equal(explicitMuscles.resultType, "completion_only");

const legacyMuscles = mapExercise(
  { id: "exercise-legacy-muscle", name: "Legacy muscle", muscleGroup: "back" },
  "trainer-a"
);
assert.deepEqual(legacyMuscles.primaryMuscles, ["back"]);
assert.equal(legacyMuscles.secondaryMuscles, undefined);

const remoteExerciseInput = exerciseToRemoteInput({
  name: "  Тяга блока  ",
  primaryMuscles: [" back ", "biceps"],
  secondaryMuscles: [" forearms "],
  equipment: " cable ",
  resultType: "weight_reps",
  notes: " controlled "
});
assert.deepEqual(remoteExerciseInput, {
  name: "Тяга блока",
  muscleGroup: "back",
  primaryMuscles: ["back", "biceps"],
  secondaryMuscles: ["forearms"],
  equipment: "cable",
  description: "controlled",
  resultType: "weight_reps"
});
assert.deepEqual(
  mapExercise({ id: "exercise-roundtrip", ...remoteExerciseInput }, "trainer-a").primaryMuscles,
  ["back", "biceps"]
);
assert.deepEqual(exerciseToRemotePatch({ primaryMuscles: [], secondaryMuscles: [] }), {
  muscleGroup: null,
  primaryMuscles: [],
  secondaryMuscles: []
});

const emptyWorkout = mapWorkout(
  {
    id: "empty-session",
    title: "Empty",
    status: "planned",
    repeatDays: [],
    scheduleTimes: {},
    items: [
      {
        id: "empty-item",
        order: 1,
        titleSnapshot: "Empty exercise",
        plannedSetTargets: []
      }
    ]
  },
  "trainer-a"
);
assert.deepEqual(emptyWorkout.repeatDays, []);
assert.deepEqual(emptyWorkout.scheduleTimes, {});
assert.deepEqual(emptyWorkout.exercises[0].sets, []);

console.log("Data round-trip regression checks passed.");
