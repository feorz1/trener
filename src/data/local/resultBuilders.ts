import type { OwnerId, SessionId, UpsertWorkoutResultInput, Workout, WorkoutResult, WorkoutResultType } from "../types";
import { getLegacyValues } from "@/features/workouts/tracking";

const defaultResultType: WorkoutResultType = "weight_reps";

export function buildWorkoutResultFromSet(input: {
  id: string;
  ownerId: OwnerId;
  sessionId: SessionId;
  sessionExerciseItemId?: string;
  exercise: Workout["exercises"][number];
  set: Workout["exercises"][number]["sets"][number];
}): WorkoutResult {
  const resultType = input.exercise.resultType ?? defaultResultType;
  const values = getLegacyValues({
    values: input.set.values,
    weight: input.set.actualWeightKg ?? input.set.targetWeightKg,
    reps: input.set.actualReps ?? input.set.targetReps,
    durationSeconds: input.set.actualDurationSeconds ?? input.set.targetDurationSeconds,
    distanceMeters: input.set.actualDistanceMeters ?? input.set.targetDistanceMeters
  });

  return {
    id: input.id,
    ownerId: input.ownerId,
    sessionId: input.sessionId,
    sessionExerciseItemId: input.sessionExerciseItemId,
    exerciseId: input.exercise.exerciseId,
    exerciseNameSnapshot: input.exercise.exerciseName,
    resultType,
    setIndex: input.set.order,
    setId: input.set.id,
    values,
    weight: input.set.actualWeightKg ?? input.set.targetWeightKg,
    repetitions: input.set.actualReps ?? input.set.targetReps,
    durationSeconds: input.set.actualDurationSeconds ?? input.set.targetDurationSeconds,
    distanceMeters: input.set.actualDistanceMeters ?? input.set.targetDistanceMeters,
    unit: "кг",
    completed: input.set.completed
  };
}

export function buildWorkoutResultFromUpsertInput(input: {
  id: string;
  ownerId: OwnerId;
  upsert: UpsertWorkoutResultInput;
  existing?: WorkoutResult;
}): WorkoutResult {
  return {
    id: input.id,
    ownerId: input.ownerId,
    sessionId: input.upsert.sessionId,
    sessionExerciseItemId: input.upsert.sessionExerciseItemId ?? input.existing?.sessionExerciseItemId,
    exerciseId: input.upsert.exerciseId,
    exerciseNameSnapshot: input.upsert.exerciseNameSnapshot ?? input.existing?.exerciseNameSnapshot,
    resultType: input.upsert.resultType ?? input.existing?.resultType,
    setIndex: input.upsert.setIndex,
    setId: input.upsert.setId ?? input.existing?.setId,
    values: input.upsert.values ?? input.existing?.values,
    weight: input.upsert.weight,
    repetitions: input.upsert.repetitions,
    durationSeconds: input.upsert.durationSeconds,
    distanceMeters: input.upsert.distanceMeters,
    unit: input.upsert.unit ?? input.existing?.unit ?? "кг",
    completed: input.upsert.completed ?? input.existing?.completed ?? false
  };
}
