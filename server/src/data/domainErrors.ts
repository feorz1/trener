import type { WorkoutSessionStatusRecord } from "./types";

export class WorkoutSeriesVersionConflictError extends Error {
  constructor() {
    super("Workout series was changed on another device");
    this.name = "WorkoutSeriesVersionConflictError";
  }
}

export class WorkoutSessionTransitionError extends Error {
  constructor(readonly currentStatus: WorkoutSessionStatusRecord, readonly requestedStatus: WorkoutSessionStatusRecord) {
    super(`Workout session cannot transition from ${currentStatus} to ${requestedStatus}`);
    this.name = "WorkoutSessionTransitionError";
  }
}

export class WorkoutSessionVersionConflictError extends Error {
  constructor() {
    super("Workout session was changed on another device");
    this.name = "WorkoutSessionVersionConflictError";
  }
}

export class IdempotencyKeyReuseError extends Error {
  constructor() {
    super("Idempotency key was already used with a different request");
    this.name = "IdempotencyKeyReuseError";
  }
}
