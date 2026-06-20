import { createInitialState } from "../seeds/mockSeed";
import { LOCAL_OWNER_ID, type Client, type Exercise, type QuickValue, type Workout, type WorkoutResult, type WorkoutSession } from "../types";
import type { PersistedSnapshot } from "./PersistedSnapshot";

export class InvalidSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSnapshotError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function getOwnerId(value: { ownerId?: unknown }) {
  return isString(value.ownerId) ? value.ownerId : LOCAL_OWNER_ID;
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every(isString));
}

function isFiniteOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isIsoString(value: unknown) {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function assertUniqueIds(items: Array<{ id: string }>, entityName: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new InvalidSnapshotError(`${entityName} contains duplicate id`);
    }
    seen.add(item.id);
  }
}

function validateClient(value: unknown): value is Client {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !isString(value.goal) || !isString(value.avatarInitials) || !isString(value.nextWorkoutAt) || !isString(value.notes)) return false;
  if (!isOptionalString(value.ownerId)) return false;
  if (!["active", "paused", "new"].includes(String(value.status))) return false;
  if (value.gender !== undefined && !["male", "female"].includes(String(value.gender))) return false;
  if (!isOptionalString(value.phone) || !isOptionalString(value.email) || !isOptionalString(value.birthDate) || !isOptionalString(value.telegram) || !isOptionalStringArray(value.restrictions)) return false;
  if (!isRecord(value.metrics)) return false;
  return typeof value.metrics.weightKg === "number" && Number.isFinite(value.metrics.weightKg)
    && typeof value.metrics.heightCm === "number" && Number.isFinite(value.metrics.heightCm)
    && typeof value.metrics.attendanceRate === "number" && Number.isFinite(value.metrics.attendanceRate);
}

function validateExercise(value: unknown): value is Exercise {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !Array.isArray(value.primaryMuscles) || !isString(value.equipment)) return false;
  if (!isOptionalString(value.ownerId)) return false;
  if (!["strength", "mobility", "cardio"].includes(String(value.category))) return false;
  if (value.source !== undefined && !["built_in", "custom"].includes(String(value.source))) return false;
  if (!value.primaryMuscles.every(isString)) return false;
  if (value.secondaryMuscles !== undefined && (!Array.isArray(value.secondaryMuscles) || !value.secondaryMuscles.every(isString))) return false;
  return isOptionalString(value.coachNotes) && isOptionalString(value.notes) && isOptionalString(value.archivedAt) && isOptionalString(value.createdAt) && isOptionalString(value.updatedAt);
}

function validateWorkout(value: unknown): value is Workout {
  if (!isRecord(value) || !isString(value.id) || !isOptionalString(value.clientId) || !isString(value.title) || !isIsoString(value.startsAt) || typeof value.durationMinutes !== "number" || !Number.isFinite(value.durationMinutes) || !isString(value.focus) || !isString(value.location)) return false;
  if (!isOptionalString(value.ownerId)) return false;
  if (!["draft", "planned", "active", "inProgress", "completed", "cancelled", "moved"].includes(String(value.status))) return false;
  if (!Array.isArray(value.exercises)) return false;
  return value.exercises.every((exercise) => {
    if (!isRecord(exercise) || !isString(exercise.id) || !isString(exercise.exerciseId) || !isString(exercise.exerciseName) || !Array.isArray(exercise.sets)) return false;
    return exercise.sets.every((set) => {
      if (!isRecord(set) || !isString(set.id) || typeof set.order !== "number" || !Number.isFinite(set.order) || typeof set.completed !== "boolean") return false;
      return isFiniteOptionalNumber(set.targetWeightKg) && isFiniteOptionalNumber(set.targetReps) && isFiniteOptionalNumber(set.actualWeightKg) && isFiniteOptionalNumber(set.actualReps);
    });
  });
}

function validateSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value) || !isString(value.id) || !isString(value.workoutId) || !isOptionalString(value.clientId) || !isIsoString(value.startedAt) || !isOptionalString(value.completedAt) || !isFiniteOptionalNumber(value.durationSeconds)) return false;
  if (!isOptionalString(value.ownerId)) return false;
  if (value.completedAt !== undefined && !isIsoString(value.completedAt)) return false;
  if (!["active", "completed", "cancelled"].includes(String(value.status)) || !Array.isArray(value.exercises)) return false;
  return value.exercises.every((exercise) => isRecord(exercise) && isString(exercise.id) && isString(exercise.exerciseId) && isString(exercise.exerciseName) && typeof exercise.order === "number" && Number.isFinite(exercise.order));
}

function validateResult(value: unknown): value is WorkoutResult {
  if (!isRecord(value) || !isString(value.id) || !isString(value.sessionId) || !isString(value.exerciseId) || typeof value.setIndex !== "number" || !Number.isFinite(value.setIndex) || !isOptionalString(value.setId) || !isOptionalString(value.unit) || typeof value.completed !== "boolean") return false;
  if (!isOptionalString(value.ownerId)) return false;
  return isFiniteOptionalNumber(value.weight) && isFiniteOptionalNumber(value.repetitions);
}

function validateQuickValue(value: unknown): value is QuickValue {
  if (!isRecord(value) || !isString(value.id) || !isString(value.exerciseId) || !isOptionalString(value.clientId) || !["weight", "reps"].includes(String(value.metric)) || !Array.isArray(value.values) || !isIsoString(value.updatedAt)) return false;
  if (!isOptionalString(value.ownerId)) return false;
  return value.values.every((item) => typeof item === "number" && Number.isFinite(item));
}

function getArray(parent: Record<string, unknown>, key: string) {
  const value = parent[key];
  if (!Array.isArray(value)) throw new InvalidSnapshotError(`snapshot.data.${key} must be an array`);
  return value;
}

export function validatePersistedSnapshot(value: unknown): PersistedSnapshot {
  if (!isRecord(value)) throw new InvalidSnapshotError("snapshot must be an object");
  if (value.schemaVersion !== 1) throw new InvalidSnapshotError("unsupported schema version");
  if (!isIsoString(value.savedAt)) throw new InvalidSnapshotError("snapshot.savedAt must be an ISO string");
  if (!isRecord(value.data)) throw new InvalidSnapshotError("snapshot.data must be an object");

  const clients = getArray(value.data, "clients");
  const exercises = Array.isArray(value.data.exercises) ? value.data.exercises : [];
  const workouts = getArray(value.data, "workouts");
  const sessions = getArray(value.data, "sessions");
  const results = getArray(value.data, "results");
  const quickValues = getArray(value.data, "quickValues");

  if (!clients.every(validateClient)) throw new InvalidSnapshotError("snapshot clients are invalid");
  if (!exercises.every(validateExercise)) throw new InvalidSnapshotError("snapshot exercises are invalid");
  if (!workouts.every(validateWorkout)) throw new InvalidSnapshotError("snapshot workouts are invalid");
  if (!sessions.every(validateSession)) throw new InvalidSnapshotError("snapshot sessions are invalid");
  if (!results.every(validateResult)) throw new InvalidSnapshotError("snapshot results are invalid");
  if (!quickValues.every(validateQuickValue)) throw new InvalidSnapshotError("snapshot quick values are invalid");

  assertUniqueIds(clients, "clients");
  assertUniqueIds(exercises, "exercises");
  assertUniqueIds(workouts, "workouts");
  assertUniqueIds(sessions, "sessions");
  assertUniqueIds(results, "results");
  assertUniqueIds(quickValues, "quickValues");

  const clientIds = new Set(clients.map((client) => client.id));
  const workoutIds = new Set(workouts.map((workout) => workout.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const exerciseIds = new Set([...createInitialState().exerciseIds, ...exercises.map((exercise) => exercise.id)]);
  const clientOwnerById = new Map(clients.map((client) => [client.id, getOwnerId(client)]));
  const workoutOwnerById = new Map(workouts.map((workout) => [workout.id, getOwnerId(workout)]));
  const sessionOwnerById = new Map(sessions.map((session) => [session.id, getOwnerId(session)]));
  const exerciseOwnerById = new Map([...createInitialState().exerciseIds.map((id) => [id, LOCAL_OWNER_ID] as const), ...exercises.map((exercise) => [exercise.id, getOwnerId(exercise)] as const)]);

  workouts.forEach((workout) => {
    const ownerId = getOwnerId(workout);
    if (workout.clientId && !clientIds.has(workout.clientId)) throw new InvalidSnapshotError("workout references unknown client");
    if (workout.clientId && clientOwnerById.get(workout.clientId) !== ownerId) throw new InvalidSnapshotError("workout references client from another owner");
    workout.exercises.forEach((exercise) => {
      if (!exerciseIds.has(exercise.exerciseId)) throw new InvalidSnapshotError("workout references unknown exercise");
      if (exerciseOwnerById.get(exercise.exerciseId) !== ownerId) throw new InvalidSnapshotError("workout references exercise from another owner");
    });
  });
  sessions.forEach((session) => {
    const ownerId = getOwnerId(session);
    if (!workoutIds.has(session.workoutId)) throw new InvalidSnapshotError("session references unknown workout");
    if (workoutOwnerById.get(session.workoutId) !== ownerId) throw new InvalidSnapshotError("session references workout from another owner");
    if (session.clientId && !clientIds.has(session.clientId)) throw new InvalidSnapshotError("session references unknown client");
    if (session.clientId && clientOwnerById.get(session.clientId) !== ownerId) throw new InvalidSnapshotError("session references client from another owner");
    session.exercises.forEach((exercise) => {
      if (!exerciseIds.has(exercise.exerciseId)) throw new InvalidSnapshotError("session references unknown exercise");
      if (exerciseOwnerById.get(exercise.exerciseId) !== ownerId) throw new InvalidSnapshotError("session references exercise from another owner");
    });
  });
  results.forEach((result) => {
    const ownerId = getOwnerId(result);
    if (!sessionIds.has(result.sessionId)) throw new InvalidSnapshotError("result references unknown session");
    if (sessionOwnerById.get(result.sessionId) !== ownerId) throw new InvalidSnapshotError("result references session from another owner");
    if (!exerciseIds.has(result.exerciseId)) throw new InvalidSnapshotError("result references unknown exercise");
    if (exerciseOwnerById.get(result.exerciseId) !== ownerId) throw new InvalidSnapshotError("result references exercise from another owner");
  });
  quickValues.forEach((quickValue) => {
    const ownerId = getOwnerId(quickValue);
    if (quickValue.clientId && !clientIds.has(quickValue.clientId)) throw new InvalidSnapshotError("quick value references unknown client");
    if (quickValue.clientId && clientOwnerById.get(quickValue.clientId) !== ownerId) throw new InvalidSnapshotError("quick value references client from another owner");
    if (!exerciseIds.has(quickValue.exerciseId)) throw new InvalidSnapshotError("quick value references unknown exercise");
    if (exerciseOwnerById.get(quickValue.exerciseId) !== ownerId) throw new InvalidSnapshotError("quick value references exercise from another owner");
  });

  return value as PersistedSnapshot;
}
