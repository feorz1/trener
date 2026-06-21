import type { ApproachSet } from "@/components/ui";

export type SessionResultSet = ApproachSet & {
  logged?: boolean;
};

export type SessionResultExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: SessionResultSet[];
};

export type WorkoutResultSnapshot = {
  workoutId: string;
  clientName: string;
  durationSeconds: number;
  exercises: SessionResultExercise[];
};

export type WorkoutResultSummary = {
  completedExercises: number;
  totalExercises: number;
  loggedExercises: number;
  loggedSets: number;
  totalVolumeKg: number;
  calories: number | null;
};

const secondsPerMinute = 60;
const minimumCalorieDurationSeconds = secondsPerMinute;
const kcalPerActiveMinute = 2.1;
const kcalPerVolumeKg = 0.018;
const kcalPerLoggedSet = 1.2;
const kcalPerLoggedExercise = 3;
const calorieRoundStep = 5;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isCompletedSet(set: SessionResultSet) {
  return set.state === "selected";
}

export function getCompletedSets(exercise: SessionResultExercise) {
  return exercise.sets.filter(isCompletedSet);
}

export function isLoggedCompletedSet(set: SessionResultSet) {
  return isCompletedSet(set) && isPositiveNumber(set.weight) && isPositiveNumber(set.reps);
}

export function getLoggedSets(exercise: SessionResultExercise) {
  return exercise.sets.filter(isLoggedCompletedSet);
}

export function summarizeWorkoutResult(snapshot: WorkoutResultSnapshot): WorkoutResultSummary {
  const completedExercises = snapshot.exercises.filter(
    (exercise) => exercise.sets.length > 0 && exercise.sets.every(isCompletedSet)
  ).length;
  const loggedExercises = snapshot.exercises.filter((exercise) => getLoggedSets(exercise).length > 0).length;
  const loggedSets = snapshot.exercises.flatMap(getLoggedSets);
  const totalVolumeKg = loggedSets.reduce((total, set) => total + (set.weight ?? 0) * (set.reps ?? 0), 0);

  if (loggedSets.length === 0 || loggedExercises === 0) {
    return {
      completedExercises,
      totalExercises: snapshot.exercises.length,
      loggedExercises,
      loggedSets: loggedSets.length,
      totalVolumeKg,
      calories: null
    };
  }

  if (snapshot.durationSeconds < minimumCalorieDurationSeconds) {
    return {
      completedExercises,
      totalExercises: snapshot.exercises.length,
      loggedExercises,
      loggedSets: loggedSets.length,
      totalVolumeKg,
      calories: 0
    };
  }

  const activeMinutes = snapshot.durationSeconds / secondsPerMinute;
  const rawCalories =
    activeMinutes * kcalPerActiveMinute +
    totalVolumeKg * kcalPerVolumeKg +
    loggedSets.length * kcalPerLoggedSet +
    loggedExercises * kcalPerLoggedExercise;

  return {
    completedExercises,
    totalExercises: snapshot.exercises.length,
    loggedExercises,
    loggedSets: loggedSets.length,
    totalVolumeKg,
    calories: Math.max(calorieRoundStep, Math.round(rawCalories / calorieRoundStep) * calorieRoundStep)
  };
}

export function formatTimerDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatResultDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
