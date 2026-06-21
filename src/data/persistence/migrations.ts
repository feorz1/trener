import { LOCAL_OWNER_ID, type OwnerId } from "../types";
import { CURRENT_SCHEMA_VERSION, type LegacyPersistedSnapshot, type PersistedSnapshot } from "./PersistedSnapshot";
import { InvalidSnapshotError, validateLegacyPersistedSnapshot, validatePersistedSnapshot } from "./validation";

function getSchemaVersion(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === "number" ? version : undefined;
}

export class UnsupportedSchemaVersionError extends Error {
  constructor(version: number | undefined) {
    super(`Unsupported local data schema version: ${String(version)}`);
    this.name = "UnsupportedSchemaVersionError";
  }
}

function withOwner<T extends { ownerId?: OwnerId }>(item: T): T & { ownerId: OwnerId } {
  return {
    ...item,
    ownerId: item.ownerId ?? LOCAL_OWNER_ID
  };
}

function migrateV1ToV2(input: LegacyPersistedSnapshot): PersistedSnapshot {
  return validatePersistedSnapshot({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: input.savedAt,
    data: {
      clients: input.data.clients.map(withOwner),
      exercises: (input.data.exercises ?? []).map(withOwner),
      workouts: input.data.workouts.map(withOwner),
      sessions: input.data.sessions.map(withOwner),
      results: input.data.results.map(withOwner),
      quickValues: input.data.quickValues.map(withOwner)
    },
    meta: {
      activeSessionId: input.meta?.activeSessionId ?? null,
      lastWorkoutDraftId: input.meta?.lastWorkoutDraftId ?? null
    }
  });
}

export function migrateSnapshot(input: unknown): PersistedSnapshot {
  const version = getSchemaVersion(input);

  if (version === CURRENT_SCHEMA_VERSION) {
    return validatePersistedSnapshot(input);
  }

  if (version === 1) {
    return migrateV1ToV2(validateLegacyPersistedSnapshot(input));
  }

  if (version === undefined) {
    throw new InvalidSnapshotError("snapshot schema version is missing");
  }

  throw new UnsupportedSchemaVersionError(version);
}
