import type { Client, Exercise, QuickValue, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutSession } from "../types";

export const CURRENT_SCHEMA_VERSION = 1;

export type PersistedSnapshotV1 = {
  schemaVersion: 1;
  savedAt: string;
  data: {
    clients: Client[];
    exercises?: Exercise[];
    workouts: Workout[];
    sessions: WorkoutSession[];
    results: WorkoutResult[];
    quickValues: QuickValue[];
  };
  meta: {
    activeSessionId: SessionId | null;
    lastWorkoutDraftId: WorkoutId | null;
  };
};

export type PersistedSnapshot = PersistedSnapshotV1;
