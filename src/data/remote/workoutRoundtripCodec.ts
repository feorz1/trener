import { getLegacyValues, getPrimaryWeightMetricKey } from "@/features/workouts/tracking";
import type { DataApiExerciseInput, DataApiWorkoutSessionInput } from "../api/dataApi.types";
import type { CreateExerciseInput, Workout, WorkoutSession } from "../types";

export function exerciseToRemoteInput(input: CreateExerciseInput): DataApiExerciseInput & { name: string } {
  const primaryMuscles = trimList(input.primaryMuscles);
  return {
    name: requiredTrim(input.name, "Новое упражнение"),
    muscleGroup: primaryMuscles[0] ?? null,
    primaryMuscles,
    secondaryMuscles: input.secondaryMuscles !== undefined ? trimList(input.secondaryMuscles) : null,
    equipment: optionalTrim(input.equipment) ?? null,
    description: optionalTrim(input.notes) ?? optionalTrim(input.coachNotes) ?? null,
    resultType: input.resultType ?? null
  };
}

export function exerciseToRemotePatch(input: Partial<CreateExerciseInput>): DataApiExerciseInput {
  const primaryMuscles = input.primaryMuscles !== undefined ? trimList(input.primaryMuscles) : undefined;
  return {
    ...(input.name !== undefined ? { name: requiredTrim(input.name, "Новое упражнение") } : {}),
    ...(primaryMuscles !== undefined ? { muscleGroup: primaryMuscles[0] ?? null, primaryMuscles } : {}),
    ...(input.secondaryMuscles !== undefined ? { secondaryMuscles: trimList(input.secondaryMuscles) } : {}),
    ...(input.equipment !== undefined ? { equipment: optionalTrim(input.equipment) ?? null } : {}),
    ...(input.notes !== undefined || input.coachNotes !== undefined
      ? { description: optionalTrim(input.notes) ?? optionalTrim(input.coachNotes) ?? null }
      : {}),
    ...(input.resultType !== undefined ? { resultType: input.resultType } : {})
  };
}

export function workoutToRemoteItems(workout: Workout): NonNullable<DataApiWorkoutSessionInput["items"]> {
  return workout.exercises.map((exercise, index) => {
    const firstSet = exercise.sets[0];
    const firstSetValues = getLegacyValues({
      values: firstSet?.values,
      weight: firstSet?.targetWeightKg,
      reps: firstSet?.targetReps,
      durationSeconds: firstSet?.targetDurationSeconds,
      distanceMeters: firstSet?.targetDistanceMeters
    });
    const weightMetricKey = getPrimaryWeightMetricKey(exercise.resultType);

    return {
      exerciseId: exercise.exerciseId,
      order: exercise.order ?? index + 1,
      titleSnapshot: exercise.exerciseName,
      resultType: exercise.resultType ?? null,
      day: exercise.day ?? null,
      supersetWithNext: exercise.supersetWithNext ?? null,
      plannedSetTargets: exercise.sets.map((set) => ({
        id: set.id,
        order: set.order,
        values: set.values ? { ...set.values } : null,
        targetWeightKg: set.targetWeightKg ?? null,
        targetReps: set.targetReps ?? null,
        targetDurationSeconds: set.targetDurationSeconds ?? null,
        targetDistanceMeters: set.targetDistanceMeters ?? null
      })),
      plannedSets: exercise.sets.length || null,
      plannedReps: firstSet?.targetReps ?? firstSetValues.reps ?? null,
      plannedWeight: weightMetricKey ? firstSetValues[weightMetricKey] ?? null : null,
      plannedDurationSec: firstSet?.targetDurationSeconds ?? firstSetValues.duration ?? null,
      restSeconds: exercise.restSeconds ?? null,
      notes: exercise.comment ?? null
    };
  });
}

export function workoutToRemoteSessionInput(
  workout: Workout,
  status: DataApiWorkoutSessionInput["status"] = "planned"
): DataApiWorkoutSessionInput & { title: string } {
  return {
    clientId: workout.clientId ?? null,
    title: workout.title || "Тренировка",
    status,
    scheduledAt: workout.startsAt,
    timezone: workout.timezone ?? null,
    durationMinutes: workout.durationMinutes,
    focus: workout.focus,
    location: workout.location,
    repeatDays: workout.repeatDays ? [...workout.repeatDays] : null,
    scheduleTimes: workout.scheduleTimes ? { ...workout.scheduleTimes } : null,
    // Kept for servers that still derive focus from the legacy notes field.
    notes: workout.focus || null,
    items: workoutToRemoteItems(workout)
  };
}

export function sessionExercisesToRemoteItems(
  exercises: WorkoutSession["exercises"]
): NonNullable<DataApiWorkoutSessionInput["items"]> {
  return exercises.map((exercise, index) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    order: exercise.order ?? index + 1,
    titleSnapshot: exercise.exerciseNameSnapshot ?? exercise.exerciseName,
    resultType: exercise.resultTypeSnapshot ?? null,
    day: exercise.day ?? null,
    supersetWithNext: exercise.supersetWithNext ?? null,
    plannedSetTargets: exercise.plannedSetTargets?.map((target) => ({
      id: target.id,
      order: target.order,
      values: target.values ? { ...target.values } : null,
      targetWeightKg: target.targetWeightKg ?? null,
      targetReps: target.targetReps ?? null,
      targetDurationSeconds: target.targetDurationSeconds ?? null,
      targetDistanceMeters: target.targetDistanceMeters ?? null
    })) ?? null,
    plannedSets: exercise.plannedSets ?? null,
    plannedReps: exercise.plannedRepetitions ?? null,
    plannedWeight: exercise.plannedWeight ?? null,
    plannedDurationSec: exercise.plannedDurationSeconds ?? null,
    restSeconds: exercise.restSeconds ?? null,
    notes: exercise.comment ?? null
  }));
}

function optionalTrim(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function requiredTrim(value: string, fallback: string) {
  return optionalTrim(value) ?? fallback;
}

function trimList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}
