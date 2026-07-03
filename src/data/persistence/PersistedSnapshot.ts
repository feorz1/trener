import type { Client, Exercise, OwnerId, QuickValue, SessionId, Workout, WorkoutId, WorkoutResult, WorkoutSession } from "../types";

export const CURRENT_SCHEMA_VERSION = 2;

type LegacyOwned<T extends { ownerId: OwnerId }> = Omit<T, "ownerId"> & { ownerId?: OwnerId };

export type PersistedSnapshotV1 = {
  schemaVersion: 1;
  savedAt: string;
  data: {
    clients: Array<LegacyOwned<Client>>;
    exercises?: Array<LegacyOwned<Exercise>>;
    workouts: Array<LegacyOwned<Workout>>;
    sessions: Array<LegacyOwned<WorkoutSession>>;
    results: Array<LegacyOwned<WorkoutResult>>;
    quickValues: Array<LegacyOwned<QuickValue>>;
  };
  meta?: {
    activeSessionId: SessionId | null;
    lastWorkoutDraftId: WorkoutId | null;
  };
};

export type PersistedSnapshotV2 = {
  schemaVersion: 2;
  savedAt: string;
  data: {
    clients: Client[];
    exercises: Exercise[];
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

export type PersistedSnapshot = PersistedSnapshotV2;
export type LegacyPersistedSnapshot = PersistedSnapshotV1;
