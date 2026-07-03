import type { WorkoutResult, WorkoutSession } from "@/types";
import { defaultWorkoutResultType } from "./sessionResult";
import { formatPreviousSetValue, getLegacyValues, normalizeTrackingType } from "./tracking";

export function getSessionCompletedResults(session: WorkoutSession, results: WorkoutResult[]) {
  return results.filter((result) => result.sessionId === session.id && result.completed);
}

export function getSessionCompletedSetCount(session: WorkoutSession, results: WorkoutResult[]) {
  return getSessionCompletedResults(session, results).length;
}

export function getSessionTotalVolume(results: WorkoutResult[]) {
  const total = results.reduce((sum, result) => {
    if (normalizeTrackingType(result.resultType ?? defaultWorkoutResultType) !== "weight_reps") return sum;
    if (!result.completed || !Number.isFinite(result.weight) || !Number.isFinite(result.repetitions)) return sum;
    return sum + (result.weight ?? 0) * (result.repetitions ?? 0);
  }, 0);

  return total > 0 && Number.isFinite(total) ? total : null;
}

export function formatSessionDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDurationCompact(totalSeconds?: number) {
  if (!Number.isFinite(totalSeconds)) return "";
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
  if (hours > 0) return `${hours} ч`;
  return `${Math.max(1, minutes)} мин`;
}

export function formatResultSet(result: Pick<WorkoutResult, "resultType" | "values" | "weight" | "repetitions" | "durationSeconds" | "distanceMeters" | "unit">) {
  const label = formatPreviousSetValue(result.resultType ?? defaultWorkoutResultType, getLegacyValues({
    values: result.values,
    weight: result.weight,
    repetitions: result.repetitions,
    durationSeconds: result.durationSeconds,
    distanceMeters: result.distanceMeters
  }));
  return label === "—" ? "без данных" : label;
}
