import assert from "node:assert/strict";
import {
  formatPreviousSetValue,
  getTimerDisplaySeconds,
  getTimerElapsedSeconds,
  getTrackingPreset,
  isSetCompleteAllowed,
  normalizeTrackingType,
  parseDurationInput,
  parseMetricInput,
  pickCompatibleValues,
  trackingPresets,
  type SetTimerState
} from "../src/features/workouts/tracking";
import type { MetricValues, WorkoutResultType } from "../src/types";

const expectedFormats: Array<[WorkoutResultType, MetricValues, string]> = [
  ["weight_reps", { weight: 25, reps: 12 }, "25×12"],
  ["reps_only", { reps: 15 }, "15"],
  ["weighted_bodyweight", { addedWeight: 20, reps: 8 }, "+20×8"],
  ["assisted_bodyweight", { assistance: 20, reps: 8 }, "20×8"],
  ["weight_reps_rpe", { weight: 80, reps: 8, rpe: 8 }, "80×8 @8"],
  ["duration_hold", { duration: 45 }, "0:45"],
  ["weight_duration", { weight: 25, duration: 45 }, "25·0:45"],
  ["distance_time", { distance: 5000, duration: 1450 }, "5км·24:10"],
  ["distance_only", { distance: 5000 }, "5км"],
  ["weight_distance", { weight: 20, distance: 100 }, "20кг·100м"],
  ["time_calories", { duration: 1800, calories: 320 }, "30:00·320"],
  ["calories_only", { calories: 40 }, "40"],
  ["interval_reps", { interval: 40, reps: 18 }, "0:40·18"],
  ["amrap", { duration: 720, rounds: 5, extraReps: 8 }, "12:00·5+8"],
  ["side_reps", { leftReps: 12, rightReps: 12 }, "12/12"],
  ["weight_side_reps", { weight: 20, leftReps: 12, rightReps: 12 }, "20·12/12"],
  ["completion_only", {}, "Выполнено"]
];

for (const [type, values, expected] of expectedFormats) {
  assert.equal(formatPreviousSetValue(type, values), expected, `${type} previous value format`);
}

assert.equal(normalizeTrackingType("reps"), "reps_only");
assert.equal(normalizeTrackingType("duration"), "duration_hold");
assert.equal(normalizeTrackingType("distance_duration"), "distance_time");
assert.equal(getTrackingPreset("assisted_bodyweight").metrics[0]?.shortLabel, "ПОМОЩЬ, КГ");
assert.equal(formatPreviousSetValue("weight_reps", { weight: 80, reps: 8, rpe: 10 }), "80×8");
assert.deepEqual(pickCompatibleValues({ weight: 80, reps: 8, rpe: 10 }, "weight_reps"), { weight: 80, reps: 8 });

assert.equal(parseDurationInput("45"), 45);
assert.equal(parseDurationInput("0:45"), 45);
assert.equal(parseDurationInput("12:30"), 750);
assert.equal(parseDurationInput("1:01:45"), 3705);
assert.equal(parseDurationInput("1:75"), undefined);

assert.equal(parseMetricInput("8,5", trackingPresets.weight_reps_rpe.metrics[2]), 8.5);
assert.equal(parseMetricInput("10.7", getTrackingPreset("reps_only").metrics[0]), 10);

assert.equal(isSetCompleteAllowed("completion_only", {}), true);
assert.equal(isSetCompleteAllowed("weight_reps", { weight: 25 }), false);
assert.equal(isSetCompleteAllowed("weight_reps", { weight: 25, reps: 12 }), true);
assert.equal(isSetCompleteAllowed("weight_reps_rpe", { weight: 80, reps: 8, rpe: 10.5 }), false);

const startedAt = 1_000_000;
const countdown: SetTimerState = {
  workoutId: "workout",
  exerciseId: "exercise",
  setId: "set",
  metricKey: "duration",
  mode: "countdown",
  status: "running",
  targetSeconds: 45,
  startedAt,
  accumulatedSeconds: 0
};
assert.equal(getTimerElapsedSeconds(countdown, startedAt + 12_400), 12);
assert.equal(getTimerDisplaySeconds(countdown, startedAt + 12_400), 33);

const pausedStopwatch: SetTimerState = {
  workoutId: "workout",
  exerciseId: "exercise",
  setId: "set",
  metricKey: "duration",
  mode: "stopwatch",
  status: "paused",
  accumulatedSeconds: 17
};
assert.equal(getTimerElapsedSeconds(pausedStopwatch, startedAt + 50_000), 17);
assert.equal(getTimerDisplaySeconds(pausedStopwatch, startedAt + 50_000), 17);

console.log("Tracking preset tests passed.");
