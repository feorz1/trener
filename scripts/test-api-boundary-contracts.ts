import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  API_OPERATION_CONTRACTS,
  ApiError,
  apiErrorToDataError,
  apiSchemas,
  clientDomainToDto,
  clientDtoToDomain,
  createApiErrorFromStatus,
  createApiRequestContext,
  createIdempotencyKey,
  quickValueDomainToDto,
  quickValueDtoToDomain,
  resultDomainToDto,
  resultDtoToDomain,
  sessionDomainToDto,
  sessionDtoToDomain,
  workoutDomainToDto,
  workoutDtoToDomain
} from "../src/api";
import type { Client, QuickValue, Workout, WorkoutResult, WorkoutSession } from "../src/data/types";

function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const client: Client = {
  id: "client-api",
  ownerId: "local-trainer",
  name: "API Client",
  phone: "+10000000000",
  email: "api@example.test",
  birthDate: "1990-01-01",
  telegram: "@api",
  gender: "female",
  goal: "Strength",
  status: "active",
  avatarInitials: "AC",
  nextWorkoutAt: "2026-06-22T10:00:00.000Z",
  notes: "Contract notes",
  restrictions: ["knee"],
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-21T10:00:00.000Z",
  metrics: { weightKg: 62, heightCm: 170, attendanceRate: 95 }
};

const workout: Workout = {
  id: "workout-api",
  ownerId: "local-trainer",
  clientId: client.id,
  title: "API Workout",
  startsAt: "2026-06-22T10:00:00.000Z",
  timezone: "Europe/Moscow",
  durationMinutes: 60,
  focus: "Legs",
  location: "Gym",
  status: "planned",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-21T10:00:00.000Z",
  repeatDays: ["monday"],
  scheduleTimes: { monday: "10:00" },
  exercises: [
    {
      id: "workout-exercise-api",
      exerciseId: "exercise-api",
      exerciseName: "Squat",
      resultType: "distance_duration",
      order: 1,
      day: "monday",
      comment: "steady",
      supersetWithNext: false,
      sets: [
        {
          id: "set-api",
          order: 1,
          targetDistanceMeters: 500,
          targetDurationSeconds: 180,
          actualDistanceMeters: 450,
          actualDurationSeconds: 170,
          completed: false
        }
      ]
    }
  ]
};

const session: WorkoutSession = {
  id: "session-api",
  ownerId: "local-trainer",
  workoutId: workout.id,
  clientId: client.id,
  status: "completed",
  startedAt: "2026-06-22T10:00:00.000Z",
  startedTimezone: "Europe/Moscow",
  completedAt: "2026-06-22T11:00:00.000Z",
  completedTimezone: "Europe/Moscow",
  durationSeconds: 3600,
  workoutTitleSnapshot: workout.title,
  createdAt: "2026-06-22T10:00:00.000Z",
  updatedAt: "2026-06-22T11:00:00.000Z",
  exercises: [
    {
      id: "session-exercise-api",
      exerciseId: "exercise-api",
      exerciseName: "Squat",
      exerciseNameSnapshot: "Squat",
      resultTypeSnapshot: "distance_duration",
      order: 1,
      comment: "steady",
      plannedSets: 1,
      plannedRepetitions: 0,
      plannedWeight: 0
    }
  ]
};

const result: WorkoutResult = {
  id: "result-api",
  ownerId: "local-trainer",
  sessionId: session.id,
  sessionExerciseItemId: session.exercises[0].id,
  exerciseId: "exercise-api",
  exerciseNameSnapshot: "Squat",
  resultType: "distance_duration",
  setIndex: 1,
  setId: "set-api",
  distanceMeters: 450,
  durationSeconds: 170,
  completed: true
};

const quickValue: QuickValue = {
  id: "quick-value-api",
  ownerId: "local-trainer",
  exerciseId: "exercise-api",
  clientId: client.id,
  metric: "duration",
  values: [90, 120],
  updatedAt: "2026-06-22T11:00:00.000Z"
};

assert.deepEqual(withoutUndefined(clientDtoToDomain(apiSchemas.client.parse(clientDomainToDto(client)))), withoutUndefined(client));
assert.deepEqual(withoutUndefined(workoutDtoToDomain(apiSchemas.workout.parse(workoutDomainToDto(workout)))), withoutUndefined(workout));
assert.deepEqual(withoutUndefined(sessionDtoToDomain(apiSchemas.session.parse(sessionDomainToDto(session)))), withoutUndefined(session));
assert.deepEqual(withoutUndefined(resultDtoToDomain(apiSchemas.result.parse(resultDomainToDto(result)))), withoutUndefined(result));
assert.deepEqual(withoutUndefined(quickValueDtoToDomain(apiSchemas.quickValue.parse(quickValueDomainToDto(quickValue)))), withoutUndefined(quickValue));

assert.throws(
  () => apiSchemas.client.parse({ ...clientDomainToDto(client), metrics: { weight_kg: "62", height_cm: 170, attendance_rate: 95 } }),
  (error) => error instanceof ApiError && error.code === "validation"
);

assert.equal(API_OPERATION_CONTRACTS["clients.list"].method, "query");
assert.equal(API_OPERATION_CONTRACTS["clients.list"].idempotency, "forbidden");
assert.equal(API_OPERATION_CONTRACTS["clients.list"].cachePolicy, "stale_while_revalidate");
assert.equal(API_OPERATION_CONTRACTS["sessions.start"].method, "mutation");
assert.equal(API_OPERATION_CONTRACTS["sessions.start"].idempotency, "required");
assert.equal(API_OPERATION_CONTRACTS["sessions.start"].cachePolicy, "no_store");

assert.throws(
  () => createApiRequestContext("sessions.start"),
  (error) => error instanceof ApiError && error.code === "idempotency_required"
);

const idempotencyKey = createIdempotencyKey("sessions.start", workout.id, "tap-1");
const mutationContext = createApiRequestContext("sessions.start", { idempotencyKey, requestId: "request-api" });
assert.equal(mutationContext.idempotencyKey, idempotencyKey);
assert.equal(mutationContext.cachePolicy, "no_store");

assert.throws(
  () => createApiRequestContext("clients.list", { idempotencyKey }),
  (error) => error instanceof ApiError && error.code === "validation"
);

const abortController = new AbortController();
abortController.abort();
assert.throws(
  () => createApiRequestContext("clients.list", { signal: abortController.signal }),
  (error) => error instanceof ApiError && error.code === "cancelled"
);

const notFoundApiError = createApiErrorFromStatus(404, { message: "Client not found", request_id: "request-404" });
assert.equal(notFoundApiError.code, "not_found");
assert.equal(notFoundApiError.retryable, false);
assert.equal(notFoundApiError.requestId, "request-404");
assert.equal(apiErrorToDataError(notFoundApiError).code, "not_found");
assert.equal(apiErrorToDataError(createApiErrorFromStatus(503)).retryable, true);

function readApiFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return readApiFiles(path);
    return path.endsWith(".ts") || path.endsWith(".md") ? [path] : [];
  });
}

const apiSource = readApiFiles(join(process.cwd(), "src/api"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

assert.doesNotMatch(apiSource, /\bfetch\s*\(/);
assert.doesNotMatch(apiSource, /\bXMLHttpRequest\b/);
assert.doesNotMatch(apiSource, /\baxios\b/);
assert.doesNotMatch(apiSource, /\bAsyncStorage\b/);
assert.doesNotMatch(apiSource, /\bSecureStore\b/);
assert.doesNotMatch(apiSource, /\bexpo-secure-store\b/);
assert.doesNotMatch(apiSource, /\bsupabase\b/i);
assert.doesNotMatch(apiSource, /\bfirebase\b/i);

console.log("API boundary contract tests passed.");
