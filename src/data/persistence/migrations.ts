import { CURRENT_SCHEMA_VERSION, type PersistedSnapshot } from "./PersistedSnapshot";
import { InvalidSnapshotError, validatePersistedSnapshot } from "./validation";

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

export function migrateSnapshot(input: unknown): PersistedSnapshot {
  const version = getSchemaVersion(input);

  if (version === CURRENT_SCHEMA_VERSION) {
    return validatePersistedSnapshot(input);
  }

  if (version === undefined) {
    throw new InvalidSnapshotError("snapshot schema version is missing");
  }

  throw new UnsupportedSchemaVersionError(version);
}
